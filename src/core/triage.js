const TIERS = {
  1: { level: 1, label: 'Refer for clinical assessment', color: '#A32D2D',
       action: 'One or more answers warrant clinician assessment before starting a gut-health program.' },
  2: { level: 2, label: 'Clinician-led management', color: '#C2622E',
       action: 'A clinician-guided plan is appropriate. Once other causes have been assessed, manual or physical therapy may be a useful adjunct (limited evidence base) for these symptoms.' },
  3: { level: 3, label: 'Microbiome-support candidate', color: '#BA7517',
       action: 'A reasonable candidate for a clinician-supervised trial of probiotic / microbiome support.' },
  4: { level: 4, label: 'Self-management & monitoring', color: '#0F6E56',
       action: 'Lifestyle-focused self-management is reasonable. Re-screen in 4–6 weeks to track change.' },