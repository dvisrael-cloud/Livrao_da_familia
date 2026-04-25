
import { formConfig } from './src/constants/formConfig.js';

const fieldIds = {};
const duplicates = [];

formConfig.forEach((field, index) => {
    if (field.fieldId) {
        if (fieldIds[field.fieldId]) {
            duplicates.push({ id: field.fieldId, index: index, firstIndex: fieldIds[field.fieldId] });
        } else {
            fieldIds[field.fieldId] = index;
        }
    }
});

if (duplicates.length > 0) {
    console.log("Duplicate fieldIds found:");
    duplicates.forEach(d => console.log(`- ${d.id} at index ${d.index} (first seen at ${d.firstIndex})`));
} else {
    console.log("No duplicate fieldIds found.");
}
