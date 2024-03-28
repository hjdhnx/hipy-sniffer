FROM python:3.8-slim
# 添加描述信息
MAINTAINER hipy-sniffer
WORKDIR /home/hipy-sniffer
# 复制文件及目录过去
COPY . /home/hipy-sniffer
RUN mkdir -p /etc/autostart
ADD app.sh /etc/autostart/
RUN sed -i 's/deb.debian.org/mirrors.ustc.edu.cn/g' /etc/apt/sources.list.d/debian.sources
RUN chmod +x /etc/autostart/app.sh && apt-get clean && apt-get update && apt-get install -y wget && apt-get install -y curl && apt-get install -y vim
RUN wget -O google-chrome-104.deb -c https://www.slimjet.com/chrome/download-chrome.php?file=files%2F104.0.5112.102%2Fgoogle-chrome-stable_current_amd64.deb && dpkg -i google-chrome-104.deb && apt-get install -f && dpkg -i google-chrome-104.deb
RUN pip install -i https://mirrors.cloud.tencent.com/pypi/simple --upgrade pip \
    && pip config set global.index-url https://mirrors.cloud.tencent.com/pypi/simple && pip install --no-cache-dir -r ./requirements.txt
# 切换容器时区
RUN cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && echo 'Asia/Shanghai' >/etc/timezone
# 设置语言支持中文打印
ENV LANG C.UTF-8
ENV LC_ALL C.UTF-8

EXPOSE 5708
ENTRYPOINT ["/etc/autostart/app.sh","run"]

# docker build -f dockerfile -t hjdhnx/hipy-sniffer .  构建命令,非此文件内命令
# docker run -d -it --name hipy-sniffer -p 5708:5708 -v /home/hipy-sniffer:/home/hipy-sniffer hjdhnx/hipy-sniffer