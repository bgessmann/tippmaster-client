Student Client – Requirements and Data Exchange Specification

✅ Functional Requirements
1.	Browser Access
-	The student client is a browser-based application.
-	It must run on modern browsers (Chrome, Edge, Firefox, Safari) with JavaScript enabled.
-	No installation is required.
2.	Connection to Local Server
-	The student opens the browser and enters the teacher’s server IP address or hostname (e.g. http://192.168.0.10:3000).
-	The application connects via Socket.IO to establish a persistent real-time connection.
3.	Login Process
-	On first load, the student is prompted to enter their name (optional: seat number or class ID).
-	After submitting, the client sends a login event via Socket.IO to the server.
4.	Exercise/Exam Participation
-	The student receives typing tasks (text blocks) from the server.
-	The app shows the typing interface and optionally disables copy/paste or corrections if configured by the teacher.
-	Typing progress is transmitted in real time (e.g. current position, speed, mistakes).
5.	Completion & Result Submission
-	When the student finishes, the result (duration, accuracy, raw input) is sent to the teacher’s app.
-	The UI indicates whether the submission was successful.

Der Server kann dem Client befehle schicken um die Tipp Übung zu steuern. Hierbei kenn ein Client pausiert werden. Es kann nicht mehr getippt werden oder 
