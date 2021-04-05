// 实现这个项目的构建任务

// 需要安装 del 插件，它是一个promise方法
const del = require('del')
// 需要安装 browser-sync 插件，支持热更新
const browserSync = require('browser-sync')

// 读取 src, 写入 dest, 组合任务[并行] parallel, 组合任务[串行] series
// watch 监视文件变化，决定是否重新执行任务
const { src, dest, parallel, series, watch } = require('gulp')
// 需要安装 gulp-load-plugins 插件
const loadPlugins = require('gulp-load-plugins')
// 使用 loadPlugins 自动安装插件
const plugins = loadPlugins()
// 接收创建的开发服务器
const bs = browserSync.create()

// 需要安装 gulp-sass 插件
// cosnt sass = require('gulp-sass')
// 需要安装 gulp-babel 插件
// 同时需要安装 @babel/core @babel/preset-env
// cosnt babel = require('gulp-babel')
// 需要安装 gulp-swig 插件
// cosnt swig = require('gulp-swig')
// 需要安装 gulp-imagemin 插件
// cosnt imagemin = require('gulp-imagemin')
// 只需下载 gulp-useref 插件 plugins自动安装
// const useref = require('gulp-useref')
// 需下载 gulp-htmlmin gulp-uglify gulp-clean-css gulp-if 

// 模拟模板页面中需要的动态数据
const data = {
  	menus: [
	    {
	      name: 'Home',
	      icon: 'aperture',
	      link: 'index.html'
	    },
	    {
	      name: 'About',
	      link: 'about.html'
	    },
	    {
	      name: 'Contact',
	      link: '#',
	      children: [
	        {
	          name: 'CSDN',
	          link: 'https://blog.csdn.net/gongye2019'
	        },
	        {
	          name: 'zhihu',
	          link: 'https://www.zhihu.com/people/gong-ye-18-46'
	        },
	        {
	          name: 'Gitee',
	          link: 'https://gitee.com/gongyexj'
	        },
	        {
	          name: 'Github',
	          link: 'https://github.com/gyxj'
	        }
	      ]
	    }
  	],
  	pkg: require('./package.json'),
  	date: new Date()
}

// 清除文件的方法
const clean = () => {
	return del(['dist', 'temp'])
}

// 样式编译任务
const style = () => {
	// { base: 'src' }  => 转换时候的基准路径
	// 转换的时候就会将基准路径后面的路径保留下来
	return src('src/assets/styles/*.scss', { base: 'src' })
		// sass 在工作的时候，认为 _ 开头的样式文件是主文件依赖的文件
		// 所以 sass 直接忽略掉这些 _ 开头的样式文件
		// { outputStyle: 'expanded' } => 完全展开的格式生成
		.pipe(plugins.sass({ outputStyle: 'expanded' }))
		.pipe(dest('temp'))
		.pipe(bs.reload({ stream: true }))
}

// 脚本编译任务
const script = () => {
	return src('src/assets/scripts/*.js', { base: 'src' })
		// babel 只是提供一个环境， presets 是 babel 插件的集合
		// 不配置 { presets: ['@babel/preset-env'] } ，转换就不会生效
		.pipe(plugins.babel({ presets: [require('@babel/preset-env')] }))
		.pipe(dest('temp'))
		.pipe(bs.reload({ stream: true }))
}

// 页面模板编译任务
const page = () => {
	return src('src/*.html', { base: 'src' })
		// // 防止模板缓存导致页面不能及时更新
		.pipe(plugins.swig({ data, defaults: {cache: false}  }))
		.pipe(dest('temp'))
		.pipe(bs.reload({ stream: true }))
}

// 图片转换任务
const image = () => {
	return src('src/assets/images/**', { base: 'src' })
		.pipe(plugins.imagemin())
		.pipe(dest('dist'))
}

// 字体文件转换任务
const font = () => {
	return src('src/assets/fonts/**', { base: 'src' })
		.pipe(plugins.imagemin())
		.pipe(dest('dist'))
}

// 额外的文件，直接拷贝
const extra = () => {
	return src('public/**', { base: 'public' })
		.pipe(dest('dist'))
}

// 服务任务
const serve = () => {
	// 监视特定的文件来执行特定的任务
	watch('src/assets/styles/*.scss', style)
	watch('src/assets/scripts/*.js', script)
	watch('src/*.html', page)
	// watch('src/assets/images/**', image)
	// watch('src/assets/fonts/**', font)
	// watch('public/**', extra)
	watch([		// 当图片字体文件或者一些静态文件变化的时候只需要重载一下
		'src/assets/images/**',
		'src/assets/fonts/**',
		'public/**'
	], bs.reload)
	bs.init({
		notify: false,	// browserSync 连接提示
		port: 2080,		// 端口
		// open: false,	// 自动打开页面
		// files: 'dist/**',	// 监听哪些文件改变后需要更新浏览器
		server: {
			baseDir: ['temp', 'src', 'public'],
			routes: {	// 优先于 baseDir
				'/node_modules': 'node_modules'
			}
		}
	})
}

// 引入useref 插件
const useref = () => {
	return src('temp/*.html', { base: 'temp' })
		.pipe(plugins.useref({ searchPath: ['temp', '.'] }))
		// 对 html js css 分别进行压缩（需要插件支持）
		.pipe(plugins.if(/\.js$/, plugins.uglify()))
		.pipe(plugins.if(/\.css$/, plugins.cleanCss()))
		.pipe(plugins.if(/\.html$/, plugins.htmlmin({
			collapseWhitespace: true,
			minifyCss: true,
			minifyJs: true
		})))
		.pipe(dest('dist'))
}

// 组合多个任务同时执行
// const compile = parallel(style, script, page, image, font)
// 开发环境下图片字体文件不需要压缩，提高执行效率
const compile = parallel(style, script, page)

// 通过 series 先执行 clean 任务，在同时执行其他任务
// 上线之前需要执行的任务
const build = series(
	clean, 
	parallel(
		series(compile, useref),
		image, 
		font, 
		extra
	)
)

// 开发环境需要执行的任务
const dev = series(compile, serve)

// 导出任务成员
module.exports = {
	clean,
	build,
	dev
}
