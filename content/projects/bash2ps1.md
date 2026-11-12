## 把常用脚本带到 Windows

bash2ps1 将常用、可移植的 Bash 自动化脚本转换为原生 PowerShell 5.1 / 7 脚本，减少在 Windows 上逐条改写命令的工作。

## 当前实现

- 本地桌面界面支持文件导入、粘贴、转换预览、诊断定位、复制及保存，也提供命令行入口。
- 支持常见变量、条件与循环、函数、数组、重定向及有限输出管道，并可打包静态子脚本依赖。
- 转换时不执行输入、不联网；生成的脚本无需 Bash 或 WSL。
- 针对不支持的语法与 Windows 环境依赖给出诊断，便于定位需要人工适配的位置。

## 使用与阶段

已发布 [v1.0.0](https://github.com/uestczhaoyan-gif/bash2ps1/releases/tag/v1.0.0)。本地需要 Python 3.10+ 和 Tkinter，运行 `Launch.cmd` 或 `python app.py` 即可打开界面。发布说明记录了真实 Bash 与两种 PowerShell 的对照验证；本主页未重复执行这些测试。

支持范围以 [README](https://github.com/uestczhaoyan-gif/bash2ps1#readme) 为准。Linux 系统专用操作、动态 Shell 代码、后台作业和无限或交互式流仍需人工适配；生成脚本使用的外部程序也需要在 Windows 中安装。
