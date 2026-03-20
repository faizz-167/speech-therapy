import { createContext, useContext, useState, useEffect } from 'react';

const PatientContext = createContext();

export const PatientProvider = ({ children }) => {
  const [patientData, setPatientData] = useState(null);
  const [weeklyPlan, setWeeklyPlan] = useState(null);
  
  // Dummy data for offline dev, normally filled by API
  useEffect(() => {
    // We will hook this up to the API later.
  }, []);

  return (
    <PatientContext.Provider value={{ patientData, setPatientData, weeklyPlan, setWeeklyPlan }}>
      {children}
    </PatientContext.Provider>
  );
};

export const usePatientContext = () => useContext(PatientContext);
