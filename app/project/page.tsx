"use client";
import {useState,useEffect} from 'react';
import Console from '../../lib/console';
import {Brand} from '../../lib/client';
export default function Project(){const [code,setCode]=useState('');useEffect(()=>setCode(new URLSearchParams(location.search).get('code')?.toUpperCase()||''),[]);return code?<Console code={code} publicProjector/>:<main className="center-page"><Brand/><h1>Open a workshop display</h1><p>Use the projector link from your presenter control center.</p><a className="btn primary" href="/presenter">Presenter login</a></main>}
