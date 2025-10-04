import './App.css'
import {BrowserRouter as Router, Route, Routes} from 'react-router-dom';
import SignUp from './user-auth/sign-up';
import Login from './user-auth/login';
import HomePage from './HomePage';
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SignUp />} />
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<HomePage />} />
      </Routes>
    </Router>
  )
}

export default App
