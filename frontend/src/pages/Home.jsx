import { Link } from "react-router-dom";

function Home() {
  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">Learn. Practice. Improve.</div>

          <h1>
            QuizInGo
            <br />
            <span>Challenge yourself.</span>
          </h1>

          <p>
            A focused quiz platform where students attempt assessments and
            teachers create engaging questions — simple, fast, and built for
            learning.
          </p>

          <div className="hero-buttons">
            <Link to="/register" className="primary-btn">
              Start Learning →
            </Link>
            <Link to="/login" className="secondary-btn">
              Explore Quizzes
            </Link>
          </div>
        </div>

        <div className="hero-visual">
          <div className="quiz-preview">
            <div className="preview-top">
              <span>Today&apos;s Quiz</span>
              <span className="timer">15:00</span>
            </div>

            <h3>Which data structure follows the LIFO principle?</h3>

            <div className="answer-option selected">
              <span>A</span>
              Stack
              <b>✓</b>
            </div>
            <div className="answer-option">
              <span>B</span>
              Queue
            </div>
            <div className="answer-option">
              <span>C</span>
              Tree
            </div>
            <div className="answer-option">
              <span>D</span>
              Graph
            </div>

            <div className="preview-footer">
              <span>Question 4 of 20</span>
              <div className="progress">
                <div></div>
              </div>
            </div>
          </div>

          <div className="floating-card score-card">
            <span>★</span>
            <div>
              <small>Your Score</small>
              <strong>92%</strong>
            </div>
          </div>

          <div className="floating-card users-card">
            <div className="avatars">
              <span>A</span>
              <span>B</span>
              <span>C</span>
            </div>
            <small>Students learning now</small>
          </div>
        </div>
      </section>

      <section className="features-section" id="features">
        <div className="section-heading">
          <span>WHY QUIZINGO</span>
          <h2>Everything you need to learn better</h2>
          <p>A clean platform designed for both students and teachers.</p>
        </div>

        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">◎</div>
            <h3>Interactive Quizzes</h3>
            <p>Attempt quizzes with an easy and distraction-free interface.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">▣</div>
            <h3>Instant Results</h3>
            <p>Get your score immediately after submitting a quiz.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">✎</div>
            <h3>Teacher Tools</h3>
            <p>Create quizzes, add questions and manage assessments easily.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">↗</div>
            <h3>Track Progress</h3>
            <p>Keep track of your previous attempts and performance.</p>
          </div>
        </div>
      </section>

      <section className="about-section" id="about">
        <div className="about-content">
          <span>BUILT FOR LEARNING</span>
          <h2>Turn every question into an opportunity to improve.</h2>
          <p>
            Whether you are preparing for exams or conducting assessments,
            QuizInGo keeps everything simple, organized and easy to use.
          </p>
          <Link to="/register" className="primary-btn">
            Create Your Account →
          </Link>
        </div>
      </section>

      <footer>
        <div className="footer-logo">
          Quiz<span>InGo</span>
        </div>
        <p>© 2026 QuizInGo. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default Home;
