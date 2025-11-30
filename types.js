"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoriesList = exports.Category = void 0;
var Category;
(function (Category) {
    Category["Housing"] = "Rent/Kodi";
    Category["Food"] = "Food & Dining";
    Category["Transport"] = "Matatu/Transport";
    Category["Utilities"] = "Electricity/KPLC";
    Category["Water"] = "Water/NCWSC";
    Category["Mobile"] = "Safaricom/Airtel";
    Category["MPesa"] = "M-Pesa Charges";
    Category["Entertainment"] = "Entertainment";
    Category["Health"] = "Health";
    Category["Shopping"] = "Shopping";
    Category["Savings"] = "Savings";
    Category["Investment"] = "Investments";
    Category["Income"] = "Income";
    Category["Other"] = "Other";
})(Category || (exports.Category = Category = {}));
exports.CategoriesList = [
    Category.Housing,
    Category.Food,
    Category.Transport,
    Category.Utilities,
    Category.Water,
    Category.Mobile,
    Category.MPesa,
    Category.Entertainment,
    Category.Health,
    Category.Shopping,
    Category.Savings,
    Category.Investment,
    Category.Income,
    Category.Other
];
