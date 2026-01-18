@echo off
REM Test script to verify Sentry AI monitoring by triggering Gemini AI call

echo Testing Sentry AI Monitoring...
echo.

set SESSION_ID=test-session-%RANDOM%
set INCIDENT_ID=test-incident-%RANDOM%

echo Session ID: %SESSION_ID%
echo Incident ID: %INCIDENT_ID%
echo.

echo 1. Creating test events...
curl -X POST http://localhost:3000/api/collect ^
  -H "Content-Type: application/json" ^
  -d "{\"session_id\":\"%SESSION_ID%\",\"type\":\"click\",\"ts\":%DATE:~-4%%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%000,\"meta\":\"{\\\"tag\\\":\\\"button\\\",\\\"testId\\\":\\\"submit-btn\\\"}\"}"

echo.
curl -X POST http://localhost:3000/api/collect ^
  -H "Content-Type: application/json" ^
  -d "{\"session_id\":\"%SESSION_ID%\",\"type\":\"rage_click\",\"ts\":%DATE:~-4%%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%000,\"meta\":\"{\\\"tag\\\":\\\"button\\\",\\\"testId\\\":\\\"submit-btn\\\"}\"}"

echo.
echo Events created
echo.
timeout /t 2 >nul

echo 2. Triggering Gemini analysis (this will take ~10-20 seconds)...
echo.
curl -X POST http://localhost:3000/api/analyze ^
  -H "Content-Type: application/json" ^
  -d "{\"session_id\":\"%SESSION_ID%\",\"incident_id\":\"%INCIDENT_ID%\"}"

echo.
echo.
echo ========================================
echo Test Complete!
echo ========================================
echo.
echo Next Steps:
echo 1. Go to Sentry: https://sentry.io/
echo 2. Navigate to: Performance -^> Traces
echo 3. Look for traces containing "gen_ai.request" spans
echo 4. Click on the trace to see the AI monitoring data
echo.
pause
