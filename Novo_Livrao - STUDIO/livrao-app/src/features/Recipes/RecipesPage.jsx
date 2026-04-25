/**
 * PROJETO: Livrão da Família
 * DESENVOLVIMENTO: HOD (CNPJ: 11.702.142/0001-70)  
 * AUTOR: David Vidal Israel (dvisrael@hotmail.com)
 * PARCERIA: Comissão Livrão da Família (Presidida por Marcia Barcessat Rubistein)
 * ASSISTÊNCIA: IA Google Gemini
 * STATUS: Código em fase de desenvolvimento
 * © 2025 HOD. Todos os direitos reservados.
 */

import React, { useState } from 'react';
import { Plus, ChefHat, Search, BookOpen, Heart, Clock, Users } from 'lucide-react';

export const RecipesPage = ({ onBack, uid }) => {
    const [recipes, setRecipes] = useState([
        {
            id: 1,
            title: 'Gefilte Fish da Vovó',
            author: 'Vovó Rachel',
            category: 'Shabat',
            prepTime: '2 horas',
            servings: '8 pessoas',
            difficulty: 'Médio',
            ingredients: [
                '1kg de peixe branco (carpa ou merluza)',
                '2 cebolas grandes',
                '3 cenouras',
                '3 ovos',
                '2 colheres de sopa de matzá meal',
                'Sal e pimenta a gosto',
                'Água para cozinhar'
            ],
            instructions: [
                'Moa o peixe junto com as cebolas',
                'Adicione os ovos, matzá meal, sal e pimenta',
                'Faça bolinhas com a massa',
                'Cozinhe em água fervente com rodelas de cenoura',
                'Deixe esfriar e sirva gelado'
            ],
            notes: 'Receita tradicional passada de geração em geração. A vovó sempre dizia que o segredo está em manter a água sempre fervente.',
            favorite: true
        }
    ]);

    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedRecipe, setSelectedRecipe] = useState(null);

    const categories = [
        { name: 'Todas', icon: BookOpen, count: recipes.length },
        { name: 'Shabat', icon: ChefHat, count: recipes.filter(r => r.category === 'Shabat').length },
        { name: 'Pessach', icon: BookOpen, count: recipes.filter(r => r.category === 'Pessach').length },
        { name: 'Rosh Hashaná', icon: BookOpen, count: recipes.filter(r => r.category === 'Rosh Hashaná').length },
        { name: 'Diário', icon: Users, count: recipes.filter(r => r.category === 'Diário').length }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-white">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-md border-b-2 border-rose-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={onBack}
                                className="p-2 hover:bg-rose-100 rounded-lg transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <div>
                                <h1 className="text-3xl font-serif font-bold text-slate-800 flex items-center gap-3">
                                    <ChefHat className="w-8 h-8 text-rose-600" />
                                    Receitas de Família
                                </h1>
                                <p className="text-sm text-slate-600 mt-1">
                                    Sabores e memórias que atravessam gerações
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-rose-500/30 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            Nova Receita
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Search and Filters */}
                <div className="mb-8">
                    <div className="relative mb-6">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Buscar receitas..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-rose-200 focus:border-rose-400 focus:ring-4 focus:ring-rose-100 outline-none transition-all text-slate-700 bg-white shadow-sm"
                        />
                    </div>

                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        {categories.map((cat) => {
                            const Icon = cat.icon;
                            return (
                                <button
                                    key={cat.name}
                                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white border-2 border-rose-200 hover:border-rose-400 hover:bg-rose-50 transition-all whitespace-nowrap shadow-sm hover:shadow-md"
                                >
                                    <Icon className="w-4 h-4 text-rose-600" />
                                    <span className="font-medium text-slate-700">{cat.name}</span>
                                    <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full text-xs font-bold">
                                        {cat.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Recipes Grid */}
                {recipes.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-24 h-24 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <ChefHat className="w-12 h-12 text-rose-400" />
                        </div>
                        <h3 className="text-2xl font-serif font-bold text-slate-700 mb-2">
                            Ainda não há receitas
                        </h3>
                        <p className="text-slate-500 mb-6">
                            Comece a preservar as receitas especiais da sua família
                        </p>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="bg-gradient-to-r from-rose-500 to-pink-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:scale-105 transition-transform"
                        >
                            Adicionar Primeira Receita
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {recipes.map((recipe) => (
                            <RecipeCard
                                key={recipe.id}
                                recipe={recipe}
                                onClick={() => setSelectedRecipe(recipe)}
                            />
                        ))}
                    </div>
                )}

                {/* Recipe Detail Modal */}
                {selectedRecipe && (
                    <RecipeDetailModal
                        recipe={selectedRecipe}
                        onClose={() => setSelectedRecipe(null)}
                    />
                )}

                {/* Add Recipe Modal */}
                {showAddModal && (
                    <AddRecipeModal
                        onClose={() => setShowAddModal(false)}
                        onSave={(newRecipe) => {
                            setRecipes([...recipes, { ...newRecipe, id: Date.now() }]);
                            setShowAddModal(false);
                        }}
                    />
                )}
            </div>
        </div>
    );
};

// Recipe Card Component
const RecipeCard = ({ recipe, onClick }) => {
    return (
        <button
            onClick={onClick}
            className="group bg-white rounded-2xl p-6 shadow-md hover:shadow-2xl transition-all duration-300 text-left border-2 border-rose-100 hover:border-rose-300 hover:-translate-y-1 active:scale-98"
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <h3 className="text-xl font-serif font-bold text-slate-800 group-hover:text-rose-700 transition-colors mb-2">
                        {recipe.title}
                    </h3>
                    <p className="text-sm text-slate-600 italic">Por {recipe.author}</p>
                </div>
                {recipe.favorite && (
                    <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
                )}
            </div>

            <div className="flex items-center gap-4 text-sm text-slate-600 mb-4">
                <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{recipe.prepTime}</span>
                </div>
                <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{recipe.servings}</span>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-semibold">
                    {recipe.category}
                </span>
                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                    {recipe.difficulty}
                </span>
            </div>
        </button>
    );
};

// Recipe Detail Modal
const RecipeDetailModal = ({ recipe, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div
                className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="sticky top-0 bg-gradient-to-r from-rose-500 to-pink-600 p-6 rounded-t-2xl">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h2 className="text-3xl font-serif font-bold text-white mb-2">
                                {recipe.title}
                            </h2>
                            <p className="text-rose-100 italic">Por {recipe.author}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Modal Content */}
                <div className="p-6 space-y-6">
                    {/* Info Badges */}
                    <div className="flex flex-wrap gap-3">
                        <div className="px-4 py-2 bg-rose-50 rounded-lg flex items-center gap-2">
                            <Clock className="w-4 h-4 text-rose-600" />
                            <span className="text-sm font-medium text-slate-700">{recipe.prepTime}</span>
                        </div>
                        <div className="px-4 py-2 bg-rose-50 rounded-lg flex items-center gap-2">
                            <Users className="w-4 h-4 text-rose-600" />
                            <span className="text-sm font-medium text-slate-700">{recipe.servings}</span>
                        </div>
                        <div className="px-4 py-2 bg-rose-50 rounded-lg">
                            <span className="text-sm font-medium text-slate-700">{recipe.difficulty}</span>
                        </div>
                        <div className="px-4 py-2 bg-rose-100 rounded-lg">
                            <span className="text-sm font-semibold text-rose-700">{recipe.category}</span>
                        </div>
                    </div>

                    {/* Ingredients */}
                    <div>
                        <h3 className="text-xl font-serif font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
                            Ingredientes
                        </h3>
                        <ul className="space-y-2">
                            {recipe.ingredients.map((ingredient, index) => (
                                <li key={index} className="flex items-start gap-3 text-slate-700">
                                    <span className="text-rose-500 font-bold">•</span>
                                    <span>{ingredient}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Instructions */}
                    <div>
                        <h3 className="text-xl font-serif font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
                            Modo de Preparo
                        </h3>
                        <ol className="space-y-3">
                            {recipe.instructions.map((step, index) => (
                                <li key={index} className="flex items-start gap-4">
                                    <span className="flex items-center justify-center w-8 h-8 bg-rose-100 text-rose-700 font-bold rounded-full flex-shrink-0">
                                        {index + 1}
                                    </span>
                                    <span className="text-slate-700 pt-1">{step}</span>
                                </li>
                            ))}
                        </ol>
                    </div>

                    {/* Notes */}
                    {recipe.notes && (
                        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
                            <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                                <BookOpen className="w-4 h-4" />
                                Nota da Família
                            </h4>
                            <p className="text-amber-800 text-sm italic">{recipe.notes}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Add Recipe Modal (Placeholder)
const AddRecipeModal = ({ onClose, onSave }) => {
    const [formData, setFormData] = useState({
        title: '',
        author: '',
        category: 'Shabat',
        prepTime: '',
        servings: '',
        difficulty: 'Médio',
        ingredients: [''],
        instructions: [''],
        notes: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="bg-gradient-to-r from-rose-500 to-pink-600 p-6 rounded-t-2xl flex items-center justify-between">
                    <h2 className="text-2xl font-serif font-bold text-white">Nova Receita</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="text-center py-12 text-slate-500">
                        <p>Formulário de adicionar receita em desenvolvimento...</p>
                        <button
                            type="button"
                            onClick={onClose}
                            className="mt-4 px-6 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors"
                        >
                            Fechar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
