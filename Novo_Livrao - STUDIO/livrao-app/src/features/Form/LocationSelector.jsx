import { LocationSelector as SharedLocationSelector } from '../../components/LocationSelector';

export const LocationSelector = ({ item, value = {}, onChange }) => {
    return <SharedLocationSelector data={value} updateData={onChange} />;
};
