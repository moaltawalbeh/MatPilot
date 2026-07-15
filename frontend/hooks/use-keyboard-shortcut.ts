"use client";
import { useEffect } from "react";
export function useKeyboardShortcut(key:string, callback:()=>void){useEffect(()=>{const listener=(event:KeyboardEvent)=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()===key){event.preventDefault();callback();}};window.addEventListener("keydown",listener);return()=>window.removeEventListener("keydown",listener)},[key,callback])}
