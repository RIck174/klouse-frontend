import { useEffect } from "react";
import { useNavigate } from "react-router-dom";


function useActiveRide(rideId){
    const navigate =useNavigate();

    useEffect(()=>{
        if(rideId) return;
         const checkActiveRide = async ()=>{
        try{
           
                const token =localStorage.getItem("token")
                const res = await fetch("http://localhost:5000/ride/active",{
                    headers:{ Authorization: `Bearer ${token}`},
                });

                if(!res.ok) return;
                const ride = await res.json()
                if(ride?._id){
                    navigate(`/rides/${ride._id}`);
                }
            }catch(err){
                console.error("Failed to fetch acctive ride",err);
            }
        }
        checkActiveRide()
    },[rideId,navigate])
}
export default useActiveRide;
