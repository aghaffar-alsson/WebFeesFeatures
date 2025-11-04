import React from 'react'
import '../Client/Head.css'
import imgg from'./img/logoo.jpg'
import imgg_44 from'./img/44 years logo hi res.jpg'


export default function Head() {
  return (
    <div>
        <div className="container">
        <img  className="imghdrlft" src={imgg} alt="EL ALSSON" />
        <div>
          <h1>© El Alsson British & American International School</h1>
          <h2>Online Fees Enquiry</h2>
          <h2>Academic Year : 2025-2026</h2>
        </div>  
        </div>
    </div>
  )
}
