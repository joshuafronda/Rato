@echo off
rem Opens the booth full screen in Chrome. --kiosk-printing sends prints straight to the
rem default Windows printer with no dialog. Start the server first (npm start).
rem To leave kiosk mode press Alt+F4.
start "" chrome --kiosk --kiosk-printing http://localhost:3000
