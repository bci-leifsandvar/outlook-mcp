# Test the modular Outlook MCP server directly (PowerShell version)

# Start the TCP wrapper in the background
$tcpWrapperProcess = Start-Process -FilePath "node" -ArgumentList "C:\dev-local\outlook-mcp\tcp-server.js" -NoNewWindow -PassThru
Start-Sleep -Seconds 2

# Open a single TCP connection for all requests
$client = New-Object System.Net.Sockets.TcpClient("localhost", 3333)
$stream = $client.GetStream()
$writer = New-Object System.IO.StreamWriter($stream)
$reader = New-Object System.IO.StreamReader($stream)

# Send initialize request
$initRequest = '{"jsonrpc":"2.0","id":"init-1","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}}'
$writer.WriteLine($initRequest)
$writer.Flush()
Start-Sleep -Milliseconds 500
$initResponse = $reader.ReadLine()
Write-Host "initialize response: $initResponse"

# Send tools/list request
$toolsList = '{"jsonrpc":"2.0","id":"test-1","method":"tools/list"}'
$writer.WriteLine($toolsList)
$writer.Flush()
Start-Sleep -Milliseconds 500
$response1 = $reader.ReadLine()
Write-Host "tools/list response: $response1"

# Send about tool call request (tool name: 'about')
$aboutToolCall = '{"jsonrpc":"2.0","id":"test-2","method":"tools/call","params":{"name":"about","arguments":{}}}'
$writer.WriteLine($aboutToolCall)
$writer.Flush()
Start-Sleep -Milliseconds 500
$response2 = $reader.ReadLine()
Write-Host "about tool response: $response2"

# Send authenticate tool call request (tool name: 'authenticate')
$authToolCall = '{"jsonrpc":"2.0","id":"test-3","method":"tools/call","params":{"name":"authenticate","arguments":{}}}'
$writer.WriteLine($authToolCall)
$writer.Flush()
Start-Sleep -Milliseconds 500
$response3 = $reader.ReadLine()
Write-Host "authenticate tool response: $response3"

# Send check-auth-status tool call request (tool name: 'check-auth-status')
$checkAuthStatusCall = '{"jsonrpc":"2.0","id":"test-4","method":"tools/call","params":{"name":"check-auth-status","arguments":{}}}'
$writer.WriteLine($checkAuthStatusCall)
$writer.Flush()
Start-Sleep -Milliseconds 500
$response4 = $reader.ReadLine()
Write-Host "check-auth-status tool response: $response4"

# Live MCP server responsiveness test (repeat about tool)
$liveTestRequest = '{"jsonrpc":"2.0","id":"live-test","method":"tools/call","params":{"name":"about","arguments":{}}}'
$writer.WriteLine($liveTestRequest)
$writer.Flush()
Start-Sleep -Milliseconds 500
$response = $reader.ReadLine()
Write-Host "Live MCP server response: $response"

$client.Close()

# Kill the TCP wrapper
Stop-Process -Id $tcpWrapperProcess.Id
Write-Host "Stopped TCP wrapper."