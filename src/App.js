import './App.css';
import UserForm from './Components/UserForm';
import { ToastContainer } from 'react-toastify';
import logo from './Assets/logo.png';

function App() {
  return (
    <div className="App">
      <img src={logo} alt="logo" className="logo" />
      <UserForm />
      <ToastContainer />
    </div>
  );
}

export default App;
