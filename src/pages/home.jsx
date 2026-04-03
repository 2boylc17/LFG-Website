import React, { useState } from 'react';

const Home = () => {
  const [count, setCount] = useState(0);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Message sent!');
    setEmail('');
    setMessage('');
  };

  return (
    <div className="home">
      <header>
        <nav>
          <h1>LFG Website</h1>
          <ul>
            <li>Home</li>
            <li>About</li>
            <li>Services</li>
            <li>Contact</li>
          </ul>
        </nav>
      </header>
      <section className="hero">
        <h2>Welcome to LFG</h2>
        <p>Let's Find Greatness together!</p>
        <button onClick={() => setCount(count + 1)}>Click me! Count: {count}</button>
      </section>
      <section className="features">
        <h3>Features</h3>
        <div className="feature-list">
          <div className="feature">
            <h4>Feature 1</h4>
            <p>Description of feature 1.</p>
          </div>
          <div className="feature">
            <h4>Feature 2</h4>
            <p>Description of feature 2.</p>
          </div>
          <div className="feature">
            <h4>Feature 3</h4>
            <p>Description of feature 3.</p>
          </div>
        </div>
      </section>
      <section className="about">
        <h3>About Us</h3>
        <p>We are a company dedicated to excellence.</p>
      </section>
      <section className="testimonials">
        <h3>Testimonials</h3>
        <div className="testimonial">
          <p>"Great service!" - User 1</p>
        </div>
        <div className="testimonial">
          <p>"Highly recommend!" - User 2</p>
        </div>
      </section>
      <section className="contact">
        <h3>Contact Us</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <textarea
            placeholder="Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          ></textarea>
          <button type="submit">Send</button>
        </form>
      </section>
      <footer>
        <p>&copy; 2023 LFG Website</p>
      </footer>
    </div>
  );
};

export default Home;