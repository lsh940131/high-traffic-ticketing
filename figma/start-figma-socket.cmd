@echo off
set PATH=C:\Users\root\.bun\bin;%PATH%
echo Starting Figma MCP WebSocket Server...
bunx cursor-talk-to-figma-socket
pause
