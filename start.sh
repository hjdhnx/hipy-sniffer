start main.exe
sleep 5
content = $(curl http://127.0.0.1:5708/active | tee startlog.json)
echo "$content"