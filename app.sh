#!/bin/bash
msg='run或0 启动项目'
case "$1" in
    run)
        nohup python3 ./main.py &
        ;;
    0)
      nohup python3 ./main.py &
      ;;
    *)
      echo -e $msg
      ;;
esac
sleep 2
curl http://127.0.0.1:5708/active
# 保留一个 bash
/bin/bash