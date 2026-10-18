@echo off
rem Lets phones and iPads on the same Wi-Fi reach the booth (private networks only):
rem port 3000 for the gallery and share links, port 3443 for an iPad running the booth over
rem https (BOOTH_ANY_DEVICE). Right-click this file and choose "Run as administrator".
rem Safe to run again: it replaces the old rule.
netsh advfirewall firewall delete rule name="Rato booth" >nul 2>&1
netsh advfirewall firewall add rule name="Rato booth" dir=in action=allow protocol=TCP localport=3000,3443 profile=private
pause
