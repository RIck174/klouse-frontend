import Sidebar from "./Sidebar";
import { useState } from "react";
import "../Css/Navigation.css"
import 'boxicons/css/boxicons.min.css';

function Navigation(){
    const [isOpen, setIsOpen] = useState(false);

    return(
        <>
        <Sidebar isOpen={isOpen} setIsOpen={setIsOpen}/>

            <div className="top-bar">
                <div className="menu" onClick={()=>setIsOpen(true)}><i className='bx bx-menu'></i></div>
                <div className="title">Klouse</div>
                <div className='prof'>
                    <div className='profie-pic'><i className='bx bxs-user'></i></div>
                </div>
            </div>
        </>
    );
}
export default Navigation;