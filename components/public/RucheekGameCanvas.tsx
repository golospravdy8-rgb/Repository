"use client";
import{useEffect,useRef,useState}from"react";
import{createPortal}from"react-dom";
interface P{isVisible:boolean;userName?:string;userPhone?:string;}
export default function RucheekGameCanvas({isVisible,userName="",userPhone=""}:P){
const canvasRef=useRef<HTMLCanvasElement>(null);
const[mounted,setMounted]=useState(false);
useEffect(()=>{setMounted(true);},[]);
useEffect(()=>{
if(!mounted||!isVisible||!canvasRef.current)return;
const canvas=canvasRef.current;
const ctx=canvas.getContext("2d");
if(!ctx)return;
canvas.width=window.innerWidth;
canvas.height=window.innerHeight;
ctx.fillStyle="rgba(0,0,0,0.1)";
ctx.fillRect(0,0,canvas.width,canvas.height);
ctx.fillStyle="#fff";
ctx.font="20px sans-serif";
ctx.textAlign="center";
ctx.fillText("🏀 РУЧЕЁК Game Canvas",canvas.width/2,canvas.height/2);
ctx.fillText("Додай гравців і натисни Старт",canvas.width/2,canvas.height/2+40);
},[mounted,isVisible]);
if(!mounted||!isVisible)return null;
return createPortal(<canvas ref={canvasRef} style={{position:"fixed",top:0,left:0,width:"100vw",height:"100vh",zIndex:9999,pointerEvents:"none",background:"transparent",cursor:"crosshair"}}/>,document.body);
}