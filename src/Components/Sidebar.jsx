import "../Css/Sidebar.css";
import { useNavigate } from "react-router-dom";

function Sidebar({isOpen, setIsOpen}){
    const navigate= useNavigate();
    const handleLogout=() =>{
        localStorage.removeItem("token");
        setIsOpen(false);
        navigate("/", {replace:true});
    }
    return(
        <>
            <div className={`overlay ${isOpen ? 'active': ''}`} 

            onClick={()=>setIsOpen(false)}>
                <div className={`sidebar ${isOpen ? 'active': ''}`}
                onClick={(e)=>e.stopPropagation()}>

                    <div className="sidebar-header">
                        <div className="brand">
                            <h2>Klouse</h2>
                            <p>Move smater.</p>
                        </div>
                    </div>

                     {/* Menu */}
                     <div className="sidebar-menu">
                        <div className="menu-item" onClick={()=>navigate("/home")}>
                            <i className='bx bxs-home' ></i>
                            <span>Home</span>
                        </div>
                        <div className="menu-item" onClick={()=>navigate("/rides")}>
                            <i className='bx bxs-car' ></i>
                            <span>Rides</span>
                        </div>
                        <div className="menu-item" onClick={()=>navigate("/payment")}>
                            <i className='bx bxs-wallet' ></i>
                            <span>Payment</span>
                        </div>
                        <div className="menu-item"  onClick={()=>navigate("/activity")}>
                            <i className='bx bxs-time-five'></i>
                            <span>Activity</span>
                        </div>
                        <div className="menu-item" onClick={()=>navigate("/settings")}>
                            <i className='bx bxs-cog'></i>
                            <span>Settings</span>
                        </div>
                        <div className="menu-item" onClick={handleLogout}>
                            <i className='bx bxs-log-out'></i>
                            <span>Logout</span>
                        </div>
                     </div>

                </div>
            </div>
        </>
    )
}
export default Sidebar;