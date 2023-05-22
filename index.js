const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const {
    MongoClient,
    ServerApiVersion,
    ObjectId
} = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;
// middle ware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.do03a5n.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const verify = (req,res,next)=>{
    // console.log('hating jwt');
    // console.log(req.headers.authorization)
    const authorization = req.headers.authorization;
    if(!authorization){
        return res.status(401).send({error: true, message: 'unauthorized access'})
    }
    const token = authorization.split(' ')[1];
    // console.log('token inside', token)
    jwt.verify(token,process.env.ACCESS_TOKEN_SECRET, (error,decoded)=>{
        if(error){
            res.send({error: true, message: 'unauthorized access'})
        }
        req.decoded= decoded;
        next()
    })
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const serviceCollection = client.db('carDoctor').collection('services')
        const checkOutCollection = client.db('carDoctor').collection('checkOuts')
        //jwt
        app.post('/jwt',(req,res)=>{
            const user = req.body;
            // console.log(user);
            const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{
                expiresIn: '1hr'
            })
            res.send({token})
        })

        //service routes
        app.get('/services', async (req, res) => {
            const search = req.query.search
            const query = {
                price: {$lt: 300, $gt: 0},
                title: { $regex: search , $options: 'i'}
            };
            // 
            const sort = req.query.sort
            
            if (sort == "asc") {
                // console.log('asc')
                const cursor = serviceCollection.find(query).sort({ price: 1 });
                const result = await cursor.toArray();
                res.send(result);
              } else {
                // console.log('dsc')
                const cursor = serviceCollection.find(query).sort({ price: -1 });
                const result = await cursor.toArray();
                res.send(result);
              }
        })

        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: new ObjectId(id)
            };
            const options = {
                // sort matched documents in descending order by rating
                projection: {
                    title: 1,
                    price: 1,
                    service_id: 1,
                    img: 1
                },
            };
            const result = await serviceCollection.findOne(query, options);
            res.send(result)
        })

        // checkOuts

        app.get('/checkOuts', verify, async (req, res) => {
            // console.log(req.headers.authorization)
            const decoded = req.decoded;
            // console.log(decoded)
            if(decoded.email !== req.query.email){
                return req.status(403).send({error: 1, message: 'forbidden access'})
            }

            let query = {};
            if (req.query ?.email) {
                query = {
                    email: req.query.email
                }
            }
            const result = await checkOutCollection.find(query).toArray();
            res.send(result)
        })

        app.post('/checkOuts', async (req, res) => {
            const checkOut = req.body;
            // console.log(checkOut)
            const result = await checkOutCollection.insertOne(checkOut)
            res.send(result)
        })

        app.patch('/checkOuts/:id', async (req,res)=>{
            const id = req.params.id
            const updateData = req.body;
            const query = {_id: new ObjectId(id)}
            const updateDoc = {
                $set: {
                  status: updateData.status
                },
              };
              const result = await checkOutCollection.updateOne(query,updateDoc);
              res.send(result)

        })

        app.delete('/checkOuts/:id', async (req, res) => {
            const id = req.params.id;
            const query={_id: new ObjectId(id)};
            const result = await checkOutCollection.deleteOne(query)
            res.send(result)

        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({
            ping: 1
        });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('The Car Doctor Server is Running')
})

app.listen(port, () => {
    console.log(`car doctor is running port: ${port}`)
})