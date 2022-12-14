const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const validator = require('validator');
const MapboxClient = require('mapbox');
const Restaurant = require('./Restaurant')
const Cart = require('./Cart')
const Menu = require('./Menu')

const FoodSchema = new Schema({
    menu: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Menu'
    }
},{
    timestamps: true
}
)

const PaymentSchema = new Schema({
    // cart: {
    //     type: mongoose.Schema.Types.ObjectId, 
    //     ref: 'Cart'
    // },
    amount: {  
        type: Number,
        required: true
    },
    currency: {  
        type: String,
        required: true
    },     
    source: {  
        type: String,
        required: true
    },     
    description: {
        type: String,
        required: true
    }

}, {
    timestamps: true
}
);

const CartSchema = new Schema({
    address: {
        type: String,
    },    
    latitude: {
        type: Number
    },
    longitude: {
        type: Number
    },
    totalPrice: {  // plus distance cost
        type: Number,
    },    
    deliveryCost: {  
        type: Number,
    },
    totalQuantity: {   
        type: Number,
    }, 
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    card: {
        type: Boolean,
        default: false
    },
    confirmed: {
        type: Boolean,
        default: false
    },
    foods: [FoodSchema],
    // quantity:  [{
    //     type: mongoose.Schema.Types.ObjectId, 
    //     ref: 'Menu'
    // }],
    restaurant: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Restaurant'
    },
    payment: [PaymentSchema]
}, {
    timestamps: true
})

// CartSchema.pre('save', async function(next) {
//     // populate the foods.name field
//     this.foods = await Cart.populate(this, 'foods.name', ['name', 'restaurant', 'type', 'price']);
//     next();

//   });
  
  
  
CartSchema.pre('save', async function (next) {

    
    // for the latitude and longitude
    const privateKey = process.env.LOCATION_API_KEY;
    const client = new MapboxClient(privateKey);
    const geocodePromise = new Promise((resolve, reject) => {
        client.geocodeForward(this.address, async (err, data) => {
            if (err) {
                reject(err);
            }
            this.latitude = data.features[0].geometry.coordinates[1];
            this.longitude = data.features[0].geometry.coordinates[0];
    
            resolve();
        });
    });
    
    geocodePromise.then(() => {
    this.longitude = this.longitude
    this.latitude = this.latitude
    next();
    });
    return geocodePromise;

}) 


CartSchema.pre('save', async function(next) {
    let restaurant = await Restaurant.findById(this.restaurant)
    // const Cart = mongoose.model('Cart', CartSchema);
    // this.foods = await Cart.populate(this, 'foods.name', ['name', 'restaurant', 'type', 'price']);
    // this.foods = await Cart.populate(this, 'foods.name foods.price', ['name', 'price']);

    // console.log(this.foods)

    let totalPrice = 0
    for (let food of this.foods) {

        if (food.menu.price) {
            totalPrice = totalPrice + food.menu.price
        } else {
            const foodItem = await Menu.findById(food.menu)
            totalPrice = totalPrice + foodItem.price
        }
    }    
    console.log(totalPrice)
    let lon1 = this.longitude 
    let lat1 = this.latitude
    let lat2 = restaurant.latitude
    let lon2 = restaurant.longitude

    function deg2rad(deg) {
        return deg * (Math.PI/180)
      }

        const R = 3959; // Radius of the Earth in miles
        const dLat = deg2rad(lat2-lat1);  // deg2rad below
        const dLon = deg2rad(lon2-lon1); 
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
          Math.sin(dLon/2) * Math.sin(dLon/2); 
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        const d = R * c; // Distance in miles
        this.deliveryCost = Math.round((d * 1.2)* 100)/100; 
        return this.totalPrice = totalPrice + this.deliveryCost     
})

module.exports = mongoose.model('Cart', CartSchema);