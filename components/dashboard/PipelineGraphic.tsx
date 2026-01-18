import React from 'react';
import { Activity, Database, Search, Siren, Terminal, Brain } from 'lucide-react';
import styles from './dashboard.module.css';

const steps = [
    { id: 'detect', label: 'Detect', icon: <Siren size={20} color="#ff5252" /> },
    { id: 'correlate', label: 'Correlate', icon: <Search size={20} color="#448aff" /> },
    { id: 'repro', label: 'Repro', icon: <Terminal size={20} color="#69f0ae" /> },
    { id: 'rank', label: 'Rank', icon: <Activity size={20} color="#ffd740" /> },
    { id: 'summarize', label: 'AI Review', icon: <Brain size={20} color="#e040fb" /> },
    { id: 'store', label: 'Warehouse', icon: <Database size={20} color="#aaa" /> }
];

export default function PipelineGraphic() {
    return (
        <div className={styles.pipelineContainer}>
            {steps.map((step, index) => (
                <React.Fragment key={step.id}>
                    <div className={`${styles.node} ${styles.nodeActive}`}>
                        {step.icon}
                        <span className={styles.nodeLabel}>{step.label}</span>
                    </div>
                    {index < steps.length - 1 && (
                        <div className={styles.connector} />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
}
