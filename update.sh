#!/bin/bash

# 检查是否有待提交的文件
git status --porcelain | grep -qE 'static/lives/lives.m3u|static/lives/lives.txt'

# 如果文件有修改且待提交
if [ $? -eq 0 ]; then
  echo "Detected changes in static/lives/lives.m3u or static/lives/lives.txt"
  
  # 添加修改的文件
  git add static/lives/lives.m3u static/lives/lives.txt
  
  # 提交修改
  git commit -m "Update lives.m3u and lives.txt"

  # 推送到远程仓库
  git push origin main  # 修改 'main' 为你的实际分支名
else
  echo "No changes to static/lives/lives.m3u or static/lives/lives.txt"
fi

