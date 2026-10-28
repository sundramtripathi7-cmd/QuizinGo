require("dotenv").config();

const connectDB = require("./config/db");
const User = require("./models/User");
const Quiz = require("./models/Quiz");
const Attempt = require("./models/Attempt");
const Question = require("./models/Question");
const Classroom = require("./models/Classroom");

const questionTypesDemo = {
  title: "Moodle Question Types Demo",
  category: "General",
  description: "One of each question type: multiple choice, multiple answer, true/false, short answer, numerical and matching.",
  duration: 15,
  icon: "🧩",
  color: "green",
  attemptsAllowed: 3,
  shuffleAnswers: true,
  passPercentage: 50,
  questions: [
    {
      type: "mcq",
      question: "Which planet is known as the Red Planet?",
      options: ["Venus", "Mars", "Jupiter", "Mercury"],
      answer: "Mars",
      feedback: "Iron oxide on its surface gives Mars its red colour.",
    },
    {
      type: "multi",
      question: "Which of these are prime numbers? (select all that apply)",
      options: ["2", "9", "11", "15", "17"],
      answer: ["2", "11", "17"],
      marks: 2,
    },
    {
      type: "truefalse",
      question: "The Pacific is the largest ocean on Earth.",
      options: ["True", "False"],
      answer: "True",
    },
    {
      type: "shortanswer",
      question: "Who wrote the play 'Romeo and Juliet'?",
      answer: ["Shakespeare", "William Shakespeare", "*Shakespeare"],
      feedback: "William Shakespeare wrote it around 1595.",
    },
    {
      type: "numerical",
      question: "What is the value of pi to two decimal places?",
      answer: 3.14,
      tolerance: 0.01,
    },
    {
      type: "matching",
      question: "Match each country with its capital.",
      pairs: [
        { prompt: "India", match: "New Delhi" },
        { prompt: "Japan", match: "Tokyo" },
        { prompt: "France", match: "Paris" },
        { prompt: "Egypt", match: "Cairo" },
      ],
      marks: 2,
    },
  ],
};

const sampleQuizzes = [
  {
    title: "DBMS Fundamentals",
    category: "Database",
    description: "Test your knowledge of database concepts and SQL.",
    duration: 30,
    icon: "🗄️",
    color: "",
    questions: [
      {
        question: "Which normal form removes partial dependency?",
        options: ["1NF", "2NF", "3NF", "BCNF"],
        answer: "2NF",
      },
      {
        question: "Which SQL command is used to retrieve data from a database?",
        options: ["INSERT", "UPDATE", "SELECT", "DELETE"],
        answer: "SELECT",
      },
      {
        question: "Which key uniquely identifies each record in a table?",
        options: ["Foreign Key", "Primary Key", "Candidate Key", "Composite Key"],
        answer: "Primary Key",
      },
      {
        question: "Which operation combines rows from two or more tables?",
        options: ["Join", "Sort", "Group", "Filter"],
        answer: "Join",
      },
      {
        question: "Which SQL clause is used to filter grouped records?",
        options: ["WHERE", "ORDER BY", "HAVING", "GROUP BY"],
        answer: "HAVING",
      },
      {
        question: "Which relationship represents one record associated with many records?",
        options: ["One-to-One", "One-to-Many", "Many-to-One", "Many-to-Many"],
        answer: "One-to-Many",
      },
      {
        question: "What does DBMS stand for?",
        options: [
          "Database Management System",
          "Data Backup Management System",
          "Database Machine System",
          "Data Management Software",
        ],
        answer: "Database Management System",
      },
      {
        question: "Which command is used to remove a table completely?",
        options: ["DELETE", "REMOVE", "DROP", "CLEAR"],
        answer: "DROP",
      },
      {
        question: "Which constraint prevents duplicate values in a column?",
        options: ["CHECK", "UNIQUE", "DEFAULT", "NOT NULL"],
        answer: "UNIQUE",
      },
      {
        question: "Which SQL clause is used to sort query results?",
        options: ["SORT BY", "ORDER BY", "GROUP BY", "ARRANGE BY"],
        answer: "ORDER BY",
      },
    ],
  },
  {
    title: "Computer Networks",
    category: "Networking",
    description: "Explore networking concepts, protocols and models.",
    duration: 25,
    icon: "🌐",
    color: "blue",
    questions: [
      {
        question: "Which layer of the OSI model deals with IP addressing?",
        options: ["Physical", "Data Link", "Network", "Transport"],
        answer: "Network",
      },
      {
        question: "What does HTTP stand for?",
        options: [
          "HyperText Transfer Protocol",
          "High Transfer Text Protocol",
          "Hyper Tool Transfer Process",
          "Host Transfer Text Protocol",
        ],
        answer: "HyperText Transfer Protocol",
      },
      {
        question: "Which device connects different networks together?",
        options: ["Switch", "Hub", "Router", "Repeater"],
        answer: "Router",
      },
      {
        question: "Which protocol is connection-oriented?",
        options: ["UDP", "TCP", "IP", "ICMP"],
        answer: "TCP",
      },
      {
        question: "What is the default port for HTTPS?",
        options: ["80", "21", "443", "25"],
        answer: "443",
      },
    ],
  },
  {
    title: "Java Programming",
    category: "Programming",
    description: "Challenge yourself with Java and OOP concepts.",
    duration: 30,
    icon: "☕",
    color: "orange",
    questions: [
      {
        question: "Which keyword is used to inherit a class in Java?",
        options: ["implements", "inherits", "extends", "super"],
        answer: "extends",
      },
      {
        question: "Which of these is not a Java primitive type?",
        options: ["int", "boolean", "String", "char"],
        answer: "String",
      },
      {
        question: "What is the entry point of a Java application?",
        options: ["start()", "main()", "run()", "init()"],
        answer: "main()",
      },
      {
        question: "Which access modifier makes a member visible only within its class?",
        options: ["public", "protected", "private", "default"],
        answer: "private",
      },
      {
        question: "Which collection does not allow duplicates?",
        options: ["List", "Set", "Queue", "ArrayList"],
        answer: "Set",
      },
    ],
  },
  {
    title: "Operating Systems",
    category: "OS",
    description: "Test your understanding of processes and memory.",
    duration: 20,
    icon: "⚙️",
    color: "green",
    questions: [
      {
        question: "Which scheduling algorithm can cause starvation?",
        options: ["FCFS", "Round Robin", "Shortest Job First", "Multilevel Queue"],
        answer: "Shortest Job First",
      },
      {
        question: "What is a deadlock?",
        options: [
          "A process finished execution",
          "Processes wait forever for resources held by each other",
          "CPU is idle",
          "Memory is full",
        ],
        answer: "Processes wait forever for resources held by each other",
      },
      {
        question: "Which memory management technique uses pages?",
        options: ["Segmentation", "Paging", "Swapping", "Compaction"],
        answer: "Paging",
      },
      {
        question: "What does a context switch do?",
        options: [
          "Installs an OS",
          "Saves and restores process state",
          "Deletes a process",
          "Allocates disk space",
        ],
        answer: "Saves and restores process state",
      },
    ],
  },
  {
    title: "Data Structures",
    category: "DSA",
    description: "Practice stacks, queues, trees, graphs and more.",
    duration: 35,
    icon: "🌳",
    color: "pink",
    questions: [
      {
        question: "Which data structure follows LIFO?",
        options: ["Queue", "Stack", "Tree", "Graph"],
        answer: "Stack",
      },
      {
        question: "Which traversal visits root, left, then right?",
        options: ["Inorder", "Preorder", "Postorder", "Level order"],
        answer: "Preorder",
      },
      {
        question: "What is the time complexity of binary search?",
        options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
        answer: "O(log n)",
      },
      {
        question: "Which structure is best for BFS?",
        options: ["Stack", "Queue", "Heap", "Hash Set"],
        answer: "Queue",
      },
      {
        question: "A complete binary tree with n nodes has height about?",
        options: ["n", "log n", "n^2", "2^n"],
        answer: "log n",
      },
    ],
  },
];

const seed = async () => {
  try {
    await connectDB();

    await Attempt.deleteMany({});
    await Question.deleteMany({});
    await Quiz.deleteMany({});
    await Classroom.deleteMany({});
    await User.deleteMany({});

    const teacher = await User.create({
      name: "Dr. Sharma",
      email: "teacher@quizingo.com",
      password: "teacher123",
      role: "teacher",
    });

    const student = await User.create({
      name: "Sundram",
      email: "student@quizingo.com",
      password: "student123",
      role: "student",
    });

    const [cseClass, javaClass] = await Classroom.insertMany([
      {
        name: "B.Tech CSE · Semester 5",
        description: "Core computer science subjects for semester 5.",
        icon: "🎓",
        color: "",
        teacher: teacher._id,
        teacherName: teacher.name,
        code: "CSE5QZ",
        students: [student._id],
      },
      {
        name: "Java Workshop",
        description: "Weekend workshop on Java and OOP. Join with the class code.",
        icon: "☕",
        color: "orange",
        teacher: teacher._id,
        teacherName: teacher.name,
        code: "JAVA24",
        students: [],
      },
    ]);

    const quizzes = [questionTypesDemo, ...sampleQuizzes].map((quiz) => ({
      ...quiz,
      questions: quiz.questions.map((q) => ({ type: "mcq", marks: 1, ...q })),
      marks: quiz.questions.reduce((sum, q) => sum + (q.marks || 1), 0),
      teacher: teacher._id,
      teacherName: teacher.name,
      classroom: quiz.title === "Java Programming" ? javaClass._id : cseClass._id,
      isPublished: true,
    }));

    await Quiz.insertMany(quizzes);

    await Question.insertMany(
      questionTypesDemo.questions.map((q) => ({
        type: "mcq",
        marks: 1,
        ...q,
        teacher: teacher._id,
        category: "General Knowledge",
      }))
    );

    console.log("Seed complete");
    console.log("Teacher: teacher@quizingo.com / teacher123");
    console.log("Student: student@quizingo.com / student123");
    console.log("Class codes: CSE5QZ (student enrolled), JAVA24 (not enrolled)");
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }
};

seed();
