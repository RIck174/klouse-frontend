import { useLocation } from "react-router-dom";
import "../Css/Homepage.css"
import {useState, useEffect} from "react";
import Navigation from "../Components/Navigation";
import Ridepage from "./Ridepage";


function Homepage(){
    
    const [showRideSheet, setShowRideSheet] = useState(false);
      const location = useLocation();

        useEffect(() => {
        if (location.state?.openSheet) {
            setShowRideSheet(true);
        }
    }, [location.state]);
    

    return(
        <div className='homepage-container'>
            <Navigation/>

            <Ridepage
                showRideSheet={showRideSheet}
                setShowRideSheet={setShowRideSheet}/>

                

             <div className='bottom-nav'>
                <div className='nav-item'><i className='bx bxs-home'></i><span>Home</span></div>
                <div className='nav-item'><i className='bx bxs-car'></i><span>Rides</span></div>
                <div className='nav-item'><i className='bx bxs-time-five'></i><span>Activity</span></div>
                <div className='nav-item'><i className='bx bxs-wallet'></i><span>Payment</span></div>
                <div className='nav-item'><i className='bx bxs-grid'></i><span>Services</span></div>
                <div className='nav-item'><i className='bx bxs-cog'></i><span>Settings</span></div>
             </div>
            </div>

    )

}
export default Homepage;