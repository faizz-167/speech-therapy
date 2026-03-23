import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getAssessmentSections, submitItemAudio, completeAssessment } from '../../api/baselines';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import toast from 'react-hot-toast';

import StimulusCard from '../../components/assessment/StimulusCard';
import AudioRecorder from '../../components/assessment/AudioRecorder';
import DefectProfileCard from '../../components/assessment/DefectProfileCard';
import LoadingState from '../../components/shared/LoadingState';

const BaselineRunner = () => {
  const { resultId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // baselineId and patientId come from route state (set by PatientIntake on navigation)
  const baselineId = location.state?.baselineId || location.state?.baseline_id || resultId;
  const patientId = location.state?.patientId || location.state?.patient_id;

  const [sections, setSections] = useState([]);
  const [items, setItems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [phase, setPhase] = useState('assessment'); // assessment | completing | results
  const [defectProfile, setDefectProfile] = useState(null);

  const {
    isRecording, audioBlob, startRecording, stopRecording, buildFormData
  } = useAudioRecorder();

  // ── Data loading ──
  useEffect(() => {
    const loadItems = async () => {
      try {
        const sectionData = await getAssessmentSections(baselineId);
        setSections(sectionData);

        let allItems = [];
        sectionData.forEach((s, sIdx) => {
          if (s.items) {
            s.items.forEach(item => {
              allItems.push({ ...item, sectionIndex: sIdx, sectionName: s.section_name || s.name });
            });
          }
        });
        setItems(allItems);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load baseline items.");
      } finally {
        setLoading(false);
      }
    };
    loadItems();
  }, [baselineId]);

  // ── Section tracking ──
  const currentItem = items[currentIndex] || null;
  const sectionInfo = useMemo(() => {
    if (!currentItem || sections.length === 0) return null;
    const sIdx = currentItem.sectionIndex ?? 0;
    const section = sections[sIdx];
    const sectionItemCount = section?.items?.length || 0;

    // Calculate item position within current section
    let itemsBeforeSection = 0;
    for (let i = 0; i < sIdx; i++) {
      itemsBeforeSection += sections[i]?.items?.length || 0;
    }
    const posInSection = currentIndex - itemsBeforeSection + 1;

    return {
      sectionIndex: sIdx,
      sectionTotal: sections.length,
      sectionName: currentItem.sectionName || `Section ${sIdx + 1}`,
      itemInSection: posInSection,
      itemSectionTotal: sectionItemCount,
    };
  }, [currentIndex, currentItem, sections]);

  // ── Submission effect ──
  useEffect(() => {
    if (!isUploading || !audioBlob) return;

    const submitData = async () => {
      try {
        const item = items[currentIndex];
        const formData = buildFormData({
          item_id: item.item_id || item.id,
          patient_baseline_result_id: resultId,
        });

        await submitItemAudio(formData);
        toast.success('Submitted', { duration: 1000 });

        // Auto-advance after 1.5s
        setTimeout(() => {
          if (currentIndex < items.length - 1) {
            setCurrentIndex(prev => prev + 1);
          } else {
            handleComplete();
          }
          setIsUploading(false);
        }, 1500);
      } catch (err) {
        console.error(err);
        toast.error("Upload failed.");
        setIsUploading(false);
      }
    };

    submitData();
  }, [isUploading, audioBlob]);

  // ── Completion ──
  const handleComplete = async () => {
    setPhase('completing');
    try {
      const result = await completeAssessment(resultId);
      setDefectProfile(result.defect_profile || []);
      setPhase('results');
    } catch (err) {
      console.error(err);
      toast.error("Failed to complete assessment.");
      setPhase('assessment');
    }
  };

  const handleToggleRecording = () => {
    if (!isRecording && !isUploading) {
      startRecording();
    } else if (isRecording) {
      stopRecording();
      setIsUploading(true);
    }
  };

  // ── Loading state ──
  if (loading) return <LoadingState message="PREPARING BASELINE..." />;

  // ── Completing overlay ──
  if (phase === 'completing') {
    return (
      <div className="fixed inset-0 bg-neo-surface z-50 flex flex-col items-center justify-center gap-12">
        <div className="relative w-40 h-40 flex items-center justify-center">
           <div className="absolute w-full h-full border-8 border-neo-border rounded-full border-t-neo-accent border-r-neo-accent animate-spin duration-1000" />
           <div className="w-20 h-20 bg-neo-text rotate-12 animate-pulse" />
        </div>
        <div className="bg-neo-bg border-4 border-neo-border p-6 text-center max-w-sm w-full mx-4 shadow-[8px_8px_0px_0px_#000] -rotate-2">
          <p className="font-sans font-black text-neo-text text-2xl uppercase tracking-widest">Analysing baseline...</p>
        </div>
      </div>
    );
  }

  // ── Results ──
  if (phase === 'results' && defectProfile) {
    return (
      <div className="w-full flex flex-col items-center pt-8 max-w-4xl mx-auto gap-12 px-4 pb-16">
        <DefectProfileCard defectProfile={defectProfile} />
        {patientId && (
          <button
            onClick={() => navigate(`/therapist/patients/${patientId}/plan`)}
            className="w-full max-w-md bh-button bg-neo-accent text-neo-text py-6 border-4 border-neo-border font-sans text-2xl font-black uppercase tracking-widest"
          >
            Create Therapy Plan
          </button>
        )}
      </div>
    );
  }

  // ── No items ──
  if (items.length === 0) {
    return <div className="text-center mt-24 font-mono text-xl text-neo-muted">NO ITEMS FOUND</div>;
  }

  // ── Assessment ──
  return (
    <div className="w-full flex flex-col pt-4 md:pt-8 max-w-4xl mx-auto px-4 pb-16">
      {/* Section progress header */}
      {sectionInfo && (
        <div className="mb-10 p-6 bg-neo-secondary border-4 border-neo-border bh-panel rotate-1 shadow-[8px_8px_0px_0px_#000]">
          <div className="flex justify-between items-end mb-4 border-b-4 border-neo-border pb-2">
            <span className="font-sans text-xl md:text-2xl font-black uppercase text-neo-text tracking-tighter">
              Section {sectionInfo.sectionIndex + 1} of {sectionInfo.sectionTotal} <br className="md:hidden" />
              <span className="text-neo-text/80 ml-0 md:ml-2 md:inline block mt-1 bg-neo-bg px-2 border-2 border-neo-border">
                {sectionInfo.sectionName}
              </span>
            </span>
            <span className="bg-neo-text text-neo-bg font-sans text-sm font-black px-3 py-1 uppercase tracking-widest hidden sm:block border-2 border-neo-bg">DIAGNOSTIC</span>
          </div>
          {/* Section blocks */}
          <div className="flex gap-2 mb-4 h-6">
            {sections.map((_, i) => (
              <div
                key={i}
                className={`flex-1 transition-colors border-4 border-neo-border ${
                  i < sectionInfo.sectionIndex
                    ? 'bg-neo-text'
                    : i === sectionInfo.sectionIndex
                      ? 'bg-neo-accent animate-pulse'
                      : 'bg-neo-surface'
                }`}
              ></div>
            ))}
          </div>
          {/* Item progress */}
          <div className="flex justify-between items-center mb-2 font-sans font-black text-sm uppercase tracking-widest text-neo-text/80 bg-neo-bg px-2 border-2 border-neo-border inline-flex">
            <span>Item {sectionInfo.itemInSection} of {sectionInfo.itemSectionTotal}</span>
            <span className="mx-4">|</span>
            <span>{currentIndex + 1} / {items.length} total</span>
          </div>
          <div className="w-full h-6 bg-neo-surface overflow-hidden border-4 border-neo-border shadow-[inset_4px_4px_0px_0px_rgba(0,0,0,0.2)]">
            <div
              className="h-full bg-neo-text border-r-4 border-neo-border transition-all duration-300 ease-out flex items-center justify-end"
              style={{ width: `${((currentIndex + 1) / items.length) * 100}%` }}
            >
                <div className="w-2 h-full bg-white opacity-50 mr-1"></div>
            </div>
          </div>
        </div>
      )}

      {/* Task header and instruction banner */}
      {currentItem?.task_name && (
        <div className="font-sans font-black text-3xl md:text-5xl text-neo-text uppercase tracking-tighter mb-4 text-center text-stroke-2 drop-shadow-[2px_2px_0px_var(--color-neo-accent)]" style={{ WebkitTextStrokeColor: 'black', color: 'var(--color-neo-bg)' }}>{currentItem.task_name}</div>
      )}
      {currentItem?.instruction && (
        <div className="w-full border-4 border-neo-border bg-neo-text px-6 py-6 mb-12 text-center -rotate-1 shadow-[8px_8px_0px_0px_var(--color-neo-accent)] relative z-10">
          <p className="font-sans font-black text-xl md:text-2xl text-neo-bg uppercase tracking-widest">{currentItem.instruction}</p>
        </div>
      )}

      <StimulusCard currentItem={currentItem} />

      <AudioRecorder
        isRecording={isRecording}
        isProcessing={isUploading}
        onToggleRecording={handleToggleRecording}
      />

      {isUploading && (
        <div className="mt-8 bg-neo-secondary border-4 border-neo-border p-4 text-center w-full max-w-sm mx-auto shadow-[8px_8px_0px_0px_#000] rotate-2">
          <p className="font-sans font-black text-neo-text text-xl uppercase tracking-widest animate-pulse">Uploading...</p>
        </div>
      )}
    </div>
  );
};

export default BaselineRunner;
