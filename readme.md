### hipy-server嗅探器使用说明
##### 技术栈:  python|quart|playwright

[套装传送门:hipy-server](https://github.com/hjdhnx/hipy-server/)  

### 安装
```shell
pip3 install -r requirements.txt
```

### 运行
```shell
python3 main.py
```

### linux使用前置条件
```shell
# 安装谷歌浏览器
apt update
wget -O google-chrome-104.deb -c https://www.slimjet.com/chrome/download-chrome.php?file=files%2F104.0.5112.102%2Fgoogle-chrome-stable_current_amd64.deb
dpkg -i google-chrome-104.deb
apt install -f
dpkg -i google-chrome-104.deb
google-chrome --version
```

### 程序启动后操作

访问你的ip+端口5708进入激活页面 [http://localhost:5708](http://localhost:5708)