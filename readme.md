### hipy-server嗅探器使用说明
##### 技术栈:  python|quart|playwright

[套装传送门:hipy-server](https://github.com/hjdhnx/hipy-server/)  

### 安装
```shell
pip3 install -r requirements.txt
```

### quart_config.json配置说明
```text
{
  "DEBUG": false, // 程度运行时是否输出嗅探的结果日志
  "HOST": "0.0.0.0",//程序运行时允许的ip，这个一般不用改
  "PORT": "5708",//程序运行端口
  "SNIFFER_DEBUG": false,//嗅探器在嗅探过程中是否打印日志，线上环境建议别开，本地调试可以打开
  "SNIFFER_HEADLESS": true,//嗅探的浏览器是否开启无头模式。调试的时候可以设为false看问题，上线一定设置为true
  "USE_CHROME": true,//使用谷歌浏览器进行嗅探。手机arm架构不支持，请设置false。其他amd64设备设为true
  "MAX_CONTENT_LENGTH": 33554432 // 默认最大内容64mb
}
```

### 运行
```shell
python main.py
```

### 打包运行
```shell
pip3 install -r build.txt
python manage.py start
python manage.py build
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

### docker一键安装(amd64架构亲测)
```shell
docker run -d -it --name hipy-sniffer -p 5708:5708 -v /home/hipy/hipy-sniffer:/home/hipy-sniffer hjdhnx/hipy-sniffer
```