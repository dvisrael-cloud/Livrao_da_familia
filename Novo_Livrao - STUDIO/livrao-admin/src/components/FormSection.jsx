import React from 'react';
import { motion } from 'framer-motion';

export const FormSection = ({ title, children, id }) => (
    <motion.section
        id={id}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-white p-6 md:p-8 rounded-lg shadow-md border-t-4 border-gold-accent mb-8"
    >
        <h2 className="text-2xl font-serif font-bold text-history-green mb-6 border-b pb-2 border-stone-200">
            {title}
        </h2>
        <div className="grid gap-6">
            {children}
        </div>
    </motion.section>
);
