import Web3 from 'web3'
//@ts-ignore
import CrowdFunding from './CrowdFunding.json'

//@ts-ignore
const web3 = new Web3(window.ethereum);
const contract = new web3.eth.Contract(CrowdFunding.abi, '0xF70E48B312439B3CB1c0b0fa2B5851d51c81AFeA');

function addListener(fn: Function) {
    //@ts-ignore
    ethereum.on('accountsChanged', fn)
}
// 导入外部接口
export declare interface Funding {
    index: number,

    title: string,
    info: string,
    goal: number,
    endTime: number,
    initiator: string,
    over: boolean,

    success: boolean,
    amount: number,
    numFunders: number,
    numUses: number,
    myAmount?: number
}

export declare interface Use {
    index: number,
    info: string,
    goal: string,
    agreeAmount: string,
    disagree: string,
    over: boolean,
    agree: number // 0: 没决定，1同意，2不同意
}

async function authenticate() {
    //@ts-ignore
    await window.ethereum.enable();
}

async function getAccount() {
    return (await web3.eth.getAccounts())[0];
}
// 获取合约上的所有众筹信息
async function getAllFundings() : Promise<Funding[]> {
    const length = await contract.methods.numFundings().call();
    const result = []
    for(let i=1; i<=length; i++)
        result.push(await getOneFunding(i));
    return result;
}
// 获取合约上的一条众筹信息
async function getOneFunding(index:number) : Promise<Funding> {
    const data = await contract.methods.fundings(index).call();
    // 将数据从wei形式转换为eth
    data.goal = Web3.utils.fromWei(data.goal, 'ether')
    data.amount = Web3.utils.fromWei(data.amount, 'ether')

    return {index, ...data}
}

// 当前账户投资的总的投资金额
async function getMyFundingAmount(index:number) : Promise<number> {
    const account = await getAccount();
    return parseInt(Web3.utils.fromWei(await contract.methods.getMyFundings(account, index).call(), 'ether'));
}

async function getMyFundings() : Promise<{init: Funding[], contr: Funding[]}> {
    const account = await getAccount();
    const all = await getAllFundings();
    const result : {
        init: Funding[],
        contr: Funding[]
    } = {
        init: [],
        contr: []
    };
    
    for(let funding of all) {
        const myAmount = await getMyFundingAmount(funding.index);
        if(funding.initiator == account) {
            result.init.push({
                myAmount,
                ...funding
            })
        }
        // 两个条件句
        if(myAmount != 0) {
            result.contr.push({
                myAmount,
                ...funding
            })
        }
    }
    return result;
}
// 注意一下此处的id与合约中的id，没有理清楚
async function contribute(id:number, value:number) {
    return await contract.methods.contribute(id).send({from: await getAccount(), value: Web3.utils.toWei(value.toString(10), 'ether')});
}
//感觉有bug
async function newFunding(account:string, title:string, info:string, amount:number, seconds:number) {
    return await contract.methods.newFunding(account, title, info, Web3.utils.toWei(amount.toString(10), 'ether'), seconds).send({
        from: account,
        gas: 1000000
    });
}

async function getAllUse(id:number) : Promise<Use[]> {
    const length = await contract.methods.getUseLength(id).call();
    const account = await getAccount();
    const rusult : Use[] = []
    for(let i=1; i<=length; i++) {
        const use = await contract.methods.getUse(id, i, account).call();
        rusult.push({
            index: i,
            info: use[0],
            goal: Web3.utils.fromWei(use[1], 'ether'),
            agreeAmount: Web3.utils.fromWei(use[2], 'ether'),
            disagree: Web3.utils.fromWei(use[3], 'ether'),
            over: use[4],
            agree: use[5]
        });
    }
    return rusult;
}

async function agreeUse(id:number, useID: number, agree:boolean) {
    const accont = await getAccount();
    return await contract.methods.agreeUse(id, useID, agree).send({
        from: accont,
        gas: 1000000
    })
}

async function newUse(id:number, goal:number, info:string) {
    const account = await getAccount();
    const eth = Web3.utils.toWei(goal.toString(10), 'ether')
    return await contract.methods.newUse(id, eth, info).send({
        from: account,
        gas: 1000000
    })
}

async function returnMoney(id: number) {
    const account = await getAccount();
    return await contract.methods.returnMoney(id).send({
        from: account,
        gas: 1000000
    })
}

export {
    getAccount,
    authenticate,
    contract,
    getAllFundings,
    getOneFunding,
    getMyFundingAmount,
    contribute,
    newFunding,
    getAllUse,
    agreeUse,
    newUse,
    getMyFundings,
    returnMoney,
    addListener
}
