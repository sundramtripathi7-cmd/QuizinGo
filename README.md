# QuizInGo

Full-stack quiz platform for students and teachers.

## Stack

- **Frontend:** React + Vite + React Router
- **Backend:** Node.js + Express + MongoDB + JWT

## Setup

### 1. Backend

```bash
cd backend
npm install
npm run seed
npm run dev
```

API runs at `http://localhost:5000`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173`.

## Demo accounts

| Role    | Email                   | Password    |
|---------|-------------------------|-------------|
| Student | student@quizingo.com    | student123  |
| Teacher | teacher@quizingo.com    | teacher123  |

## Features

- Register / login with student or teacher roles
- Student dashboard, quiz attempt, timer, results review
- Teacher dashboard and quiz creation
- JWT-protected API routes

# QuizInGo — Online Quiz Management System

QuizInGo is a web-based online quiz management system designed to simplify quiz creation, participation, and result viewing. It provides separate functionalities for students and teachers, making it easier to manage quizzes and evaluate student performance.

## 1. Project Information

- **Project Title:** QuizInGo — Online Quiz Management System
- **Course:** CS545 — Software Engineering
- **Institute:** Indian Institute of Information Technology Vadodara
- **Program:** Master of Computer Applications (MCA)
- **Academic Session:** Autumn 2026–27

### Group Members

Update the following table with the actual details of all group members.

| S. No. | Name | Enrollment Number |
|---|---|---|
| 1 | Sundram Tripathi | 20251651091 |
| 2 | [Member 2 Name] | [Enrollment Number] |
| 3 | [Member 3 Name] | [Enrollment Number] |

## 2. Project Overview

QuizInGo provides an online platform where teachers can create quizzes and add questions, while students can access available quizzes, submit their answers, and view their results.

The application follows a frontend-backend architecture. The frontend provides the user interface, the backend handles application requests and business logic, and MongoDB stores application data.

### Objectives

- Provide an online platform for quiz management.
- Allow teachers to create quizzes and add questions.
- Allow students to view and attempt available quizzes.
- Display quiz results after submission.
- Store user, quiz, question, and attempt information in a database.
- Apply software engineering concepts such as requirements analysis, system design, implementation, and functional testing.

## 3. Main Features

### Student Features
- OTP-based login.
- View available quizzes.
- Open quiz details.
- Attempt and submit quizzes.
- View scores and previous attempt information.

### Teacher Features
- Access teacher functionality.
- Create and save quizzes.
- Add questions and answer options.
- Manage quiz content through the application interface.

*Note: Features listed here should match the functionality implemented in the submitted version.*

## 4. Technology Stack

| Component | Technology |
|---|---|
| Frontend | React |
| Frontend Build Tool | Vite |
| Routing | React Router |
| Backend Runtime | Node.js |
| Backend Framework | Express.js |
| Database | MongoDB |
| Authentication | OTP-based login and JWT |
| API Communication | HTTP/REST-style API requests |
| Language | JavaScript |

## 5. Software Requirements

The following software is required to run the project locally:

- **Operating System:** Windows, Linux, or macOS.
- **Node.js and npm:** A compatible version installed on the system.
- **MongoDB:** A running MongoDB instance or an accessible MongoDB Atlas database.
- **Web Browser:** Google Chrome, Microsoft Edge, or another modern browser.
- **Code Editor:** Visual Studio Code or any suitable editor.
- **Internet Connection:** Required for network access and any externally hosted services used by the application.

## 6. Project Structure

The project is organized into separate frontend and backend directories.

```text
QuizInGo/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   │   ├── student/
│   │   │   └── teacher/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── api.js
│   └── package.json
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── server.js
│   └── package.json
│
├── README.md
└── .gitignore
```

The structure above is representative. Keep the actual folder and file names consistent with the submitted source code.

### Important Backend Models

- `User.js` — user-related data.
- `Quiz.js` — quiz information.
- `Question.js` — quiz questions and related data.
- `Attempt.js` — student quiz attempts and associated results.
- `Classroom.js` — classroom-related data.
- `OtpChallenge.js` — OTP challenge information.

## 7. Installation and Execution

Follow these steps to run QuizInGo locally.

### Step 1: Prerequisites

Install Node.js and npm, and ensure MongoDB is available. Open the project folder in Visual Studio Code or a terminal.

### Step 2: Configure the Backend

Open a terminal and navigate to the backend directory.

```bash
cd backend
npm install
```

Configure the backend environment variables according to the project's existing configuration. These may include the MongoDB connection URI, authentication secrets, and other settings required by the application.

**Important:** Do not upload real database credentials, passwords, OTP secrets, or JWT secrets to a public repository.

### Step 3: Start the Backend

From the `backend` directory, run:

```bash
npm run dev
```

The backend is expected to run at:

`http://localhost:5000`

Confirm that the terminal reports a successful database connection before testing database-dependent functionality.

### Step 4: Install Frontend Dependencies

Open a separate terminal and navigate to the frontend directory.

```bash
cd frontend
npm install
```

### Step 5: Start the Frontend

From the `frontend` directory, run:

```bash
npm run dev
```

The frontend is expected to run at:

`http://localhost:5173`

Open this address in a browser to access QuizInGo.

### Step 6: Verify the Application

1. Confirm that the backend starts successfully.
2. Confirm that MongoDB is connected.
3. Open the frontend in a browser.
4. Test login using an appropriate registered account.
5. Verify quiz listing, quiz creation, question management, quiz submission, and result viewing as applicable.

**Database safety:** Do not run database seeding commands or delete collections when existing records must be preserved. The seed script is not required for normal application startup.

## 8. Functional Testing

Functional testing was conducted on the available application using existing MongoDB data.

The reported executed tests covered:

- User login.
- Viewing available quizzes.
- Attempting and submitting a quiz.
- Viewing results and attempt history.
- Creating a quiz.
- Adding questions and answer options.

The current testing summary is:

| Status | Test Cases |
|---|---:|
| Passed | 7 |
| Failed | 0 |
| Not Run | 2 |
| Total | 9 |

Invalid OTP verification and required-field validation remain pending. Update this summary after executing the remaining tests and recording their actual outcomes.

## 9. Project Documentation

The final submission may include the following supporting documents:

- Software Requirements Specification (SRS).
- Project planning and software process model.
- Use case diagram.
- Data Flow Diagrams (DFDs).
- UML class diagram.
- Sequence diagrams.
- Functional test case design and testing summary.
- Final project report in editable Word and PDF formats.
- Screenshots of the running application.
- Individual contribution statements.

Keep these files in the documentation and report folders included in the final submission ZIP.

## 10. Limitations and Future Enhancements

Possible areas for improvement include:

- More comprehensive authentication and security testing.
- Additional validation and error-handling tests.
- Improved performance for large numbers of users.
- Enhanced quiz analytics and student progress reports.
- Improved accessibility and mobile responsiveness.
- Production deployment, database backup, and recovery procedures.

## 11. Individual Contributions

Replace the sample entries below with the actual work completed by each group member.

| Group Member |
Sundram Tripathi [20251651091]
Abhinav kumar [20251651004]
Ankit kumar[20251651022]
Akshay Kumar[20251651012]


## 12. Repository and Contact Information

- **GitHub Repository:** [Add the project repository URL, if applicable]
- **Project Team:** [Group_18]
- **Course:** CS545 — Software Engineering
- **Institute:** Indian Institute of Information Technology Vadodara

## 13. Academic Integrity

This project has been prepared for academic learning and demonstration. All submitted source code, diagrams, documentation, testing outcomes, and contribution statements should accurately represent the team's work. External resources used in the project should be acknowledged where applicable.
