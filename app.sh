#!/bin/bash
msg='run或0 启动项目'
case "$1" in
    run)
        python3 ./main.py
        ;;
    0)
      python3 ./main.py
      ;;
    *)
      echo -e $msg
      ;;
esac
curl http://127.0.0.1/active
# 保留一个 bash
/bin/bash