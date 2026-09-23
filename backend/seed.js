require("dotenv").config();

const connectDB = require("./config/db");
const User = require("./models/User");
const Quiz = require("./models/Quiz");

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

    await Quiz.deleteMany({});
    await User.deleteMany({});

    const teacher = await User.create({
      name: "Dr. Sharma",
      email: "teacher@quizingo.com",
      password: "teacher123",
      role: "teacher",
    });

    await User.create({
      name: "Sundram",
      email: "student@quizingo.com",
      password: "student123",
      role: "student",
    });

    const quizzes = sampleQuizzes.map((quiz) => ({
      ...quiz,
      marks: quiz.questions.length,
      teacher: teacher._id,
      teacherName: teacher.name,
      isPublished: true,
    }));

    await Quiz.insertMany(quizzes);

    console.log("Seed complete");
    console.log("Teacher: teacher@quizingo.com / teacher123");
    console.log("Student: student@quizingo.com / student123");
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }
};

seed();
