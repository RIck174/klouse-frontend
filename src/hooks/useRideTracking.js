import { useEffect,useState } from "react";
import { getDistance } from "geolib";
import socket from "../socket";

function useRideTracking(rideId){
    const [driverPosition, setDriverPosition]=useState(null);
    const [userPosition,setUserPosition]= useState(null);
    const [eta,setEta]= useState(null);
    const [distance, setDistance]= useState(null);
    const [driverInfo,setDriverInfo]=useState(null);
    const [rideStatus,setRideStatus]=useState("searching");


//Listen for driver location
    useEffect(()=>{
        if(!rideId) return;

        socket.emit("rideRoom",rideId);
        socket.on("driverLocationUpdated",({lat,lng})=>{
            setDriverPosition([lat,lng])
        });

        return()=> socket.off("driverLocationUpdated")
    },[rideId])



   // watch user's gps location
   useEffect(()=>{
    const watcher=navigator.geolocation.watchPosition(({coords})=>{
        setUserPosition([coords.latitude,coords.longitude])
    });

    return()=>navigator.geolocation.clearWatch(watcher)
   },[])



   //Recalculating distance when position changes
   useEffect(()=>{
    if(!userPosition || !driverPosition) return

    const meters=getDistance(
        {latitude:driverPosition[0], longitude:driverPosition[1]},
        {latitude:userPosition[0], longitude:userPosition[1]}
    )


    const km=meters/1000
    setDistance(km.toFixed(2));

    const averageSpeedKmh=30;
    setEta(Math.round((km/averageSpeedKmh) *60))
   },[driverPosition,userPosition])


//listen for driver accepting ride
useEffect(()=>{
    socket.on("rideAccepted",({driverName, driverRating})=>{
        setDriverInfo({name:driverName,rating:driverRating});
        setRideStatus("accepted")
    });
    return()=>socket.off("rideAccepted")
})



   return {driverPosition,userPosition,eta,distance,driverInfo,rideStatus}
}
export default useRideTracking