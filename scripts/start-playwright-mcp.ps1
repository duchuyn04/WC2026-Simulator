# Playwright MCP server — headed mode, browser visible on desktop.
# Cursor connects via http://localhost:8931/mcp (see User/mcp.json).
# Restart Cursor after first setup if MCP tools don't appear.

$port = 8931
Write-Host "Starting Playwright MCP (headed) on port $port ..."
Write-Host "Keep this window open. Press Ctrl+C to stop."
Write-Host ""

npx @playwright/mcp@latest --port $port