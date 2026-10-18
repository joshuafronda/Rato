@echo off
rem Lets phones on the same Wi-Fi open the gallery and share links (port 3000, private
rem networks only). Right-click this file and choose "Run as administrator". Run once.
netsh advfirewall firewall add rule name="Rato booth" dir=in action=allow protocol=TCP localport=3000 profile=private
pause
