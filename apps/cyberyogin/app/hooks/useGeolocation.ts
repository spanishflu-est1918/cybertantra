import { useEffect, useState } from 'react';

export function useGeolocation() {
  const [userCity, setUserCity] = useState('');

  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        if (data.city) {
          setUserCity(data.city.toUpperCase());
        } else {
          setUserCity('UNKNOWN');
        }
      })
      .catch(() => setUserCity('UNKNOWN'));
  }, []);

  return userCity;
}