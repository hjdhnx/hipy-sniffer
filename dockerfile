FROM python:3.8-slim
# 添加描述信息
MAINTAINER hipy-sniffer
WORKDIR /hipy 
RUN cp ./sources.list /etc/apt/ && apt-get update && apt-get install -y wget && wget -O google-chrome-104.deb -c https://www.slimjet.com/chrome/download-chrome.php?file=files%2F104.0.5112.102%2Fgoogle-chrome-stable_current_amd64.deb && apt-get install -f && dpkg -i google-chrome-104.deb
RUN pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple && pip install --no-cache-dir -r ./requirements.txt
# 切换容器时区
RUN cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && echo 'Asia/Shanghai' >/etc/timezone
# 设置语言支持中文打印
ENV LANG C.UTF-8
ENV LC_ALL C.UTF-8

EXPOSE 5708
CMD ["python3", "./main.py"]

#docker run -d -it --name hipy -p 5708:5708 -v /home/hipy-server:/home/hipy-server python:3.8-slim