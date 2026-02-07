import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css'
import Head from '../Client/Head.jsx'
import SignUp from '../Client/SignUp.jsx'
import SignIn from '../Client/SignIn.jsx'
import FmInfo from '../Client/FmInfo.jsx';
import StFees from '../Client/StFees.jsx';
import BankForm from '../Client/BankForm.jsx';
import StPay from '../Client/StPay.jsx';
import CheckoutPage from '../Client/CheckoutPage.jsx';
import CheckoutResult from '../Client/CheckoutResult.jsx';
import PssForgot from '../Client/PssForgot.jsx';

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
    <Head />
    <BrowserRouter>
    <Routes>
      <Route path='/' element={<SignIn />} />
      <Route path='/signup' element={<SignUp />} />
      <Route path='/signin' element={<SignIn />} />
      <Route path='/fminfo' element={<FmInfo />} />
      <Route path='/stfees' element={<StFees />} />
      <Route path='/bnkform' element={<BankForm />} />
      <Route path='/stpayhist' element={<StPay />} />
      <Route path='/checkoutpage' element={<CheckoutPage />} />
      <Route path='/checkout-result' element={<CheckoutResult />} />
      <Route path='/forgot-pswd' element={<PssForgot />} />
    </Routes>
    </BrowserRouter>

    </>
  )
}

export default App
