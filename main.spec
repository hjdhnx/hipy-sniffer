# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=[('templates', 'templates'),('static', 'static'),('sniffer','sniffer'),
    ],   # 这里需要添加你的静态文件路径
    recurse=['quart', 'playwright'],  # 这里需要添加你的包名
    # hiddenimports=['uvicorn.logging'],  # 这里需要添加你的包名, 加入第三方包隐试调用的其它包
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='main',                  # 这里需要修改你的可执行文件名
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,                 # 是否显示控制台窗口
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='.\\static\\logo.ico',  # 指定图标, 这里必须要ico格式
)
