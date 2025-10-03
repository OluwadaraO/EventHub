import './App.css'
import {BrowserRouter as Router, Route, Routes} from 'react-router-dom';
import SignUp from './user-auth/sign-up';
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SignUp />} />
      </Routes>
    </Router>
  )
}

export default App
