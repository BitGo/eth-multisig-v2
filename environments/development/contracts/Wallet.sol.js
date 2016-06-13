// Factory "morphs" into a Pudding class.
// The reasoning is that calling load in each context
// is cumbersome.

(function() {

  var contract_data = {
    abi: [{"constant":false,"inputs":[{"name":"_owner","type":"address"}],"name":"removeOwner","outputs":[],"type":"function"},{"constant":false,"inputs":[{"name":"_owner","type":"address"},{"name":"_operation","type":"bytes32"}],"name":"hasOwnerConfirmedOperation","outputs":[{"name":"","type":"bool"}],"type":"function"},{"constant":false,"inputs":[{"name":"_index","type":"uint256"}],"name":"getPendingTransaction","outputs":[{"name":"","type":"bytes32"}],"type":"function"},{"constant":false,"inputs":[{"name":"_addr","type":"address"}],"name":"isOwner","outputs":[{"name":"","type":"bool"}],"type":"function"},{"constant":true,"inputs":[],"name":"m_numOwners","outputs":[{"name":"","type":"uint256"}],"type":"function"},{"constant":false,"inputs":[],"name":"numPendingTransactions","outputs":[{"name":"","type":"uint256"}],"type":"function"},{"constant":true,"inputs":[],"name":"m_lastDay","outputs":[{"name":"","type":"uint256"}],"type":"function"},{"constant":true,"inputs":[],"name":"version","outputs":[{"name":"","type":"uint256"}],"type":"function"},{"constant":false,"inputs":[],"name":"resetSpentToday","outputs":[],"type":"function"},{"constant":true,"inputs":[],"name":"m_spentToday","outputs":[{"name":"","type":"uint256"}],"type":"function"},{"constant":false,"inputs":[{"name":"_operation","type":"bytes32"}],"name":"getPendingTransactionValue","outputs":[{"name":"","type":"uint256"}],"type":"function"},{"constant":false,"inputs":[{"name":"_owner","type":"address"}],"name":"addOwner","outputs":[],"type":"function"},{"constant":true,"inputs":[],"name":"m_required","outputs":[{"name":"","type":"uint256"}],"type":"function"},{"constant":false,"inputs":[{"name":"_h","type":"bytes32"}],"name":"confirm","outputs":[{"name":"","type":"bool"}],"type":"function"},{"constant":false,"inputs":[{"name":"_operation","type":"bytes32"}],"name":"getPendingTransactionToAddress","outputs":[{"name":"","type":"address"}],"type":"function"},{"constant":false,"inputs":[],"name":"getNextSequenceId","outputs":[{"name":"","type":"uint256"}],"type":"function"},{"constant":false,"inputs":[{"name":"_newLimit","type":"uint256"}],"name":"setDailyLimit","outputs":[],"type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"},{"name":"_data","type":"bytes"}],"name":"execute","outputs":[{"name":"_r","type":"bytes32"}],"type":"function"},{"constant":false,"inputs":[{"name":"_operation","type":"bytes32"}],"name":"revoke","outputs":[],"type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"},{"name":"_data","type":"bytes"},{"name":"_expireTime","type":"uint256"},{"name":"_sequenceId","type":"uint256"},{"name":"_signature","type":"bytes"}],"name":"executeAndConfirm","outputs":[{"name":"_r","type":"bytes32"}],"type":"function"},{"constant":false,"inputs":[{"name":"_newRequired","type":"uint256"}],"name":"changeRequirement","outputs":[],"type":"function"},{"constant":false,"inputs":[{"name":"_operation","type":"bytes32"}],"name":"getPendingTransactionData","outputs":[{"name":"","type":"bytes"}],"type":"function"},{"constant":true,"inputs":[{"name":"_operation","type":"bytes32"},{"name":"_owner","type":"address"}],"name":"hasConfirmed","outputs":[{"name":"","type":"bool"}],"type":"function"},{"constant":false,"inputs":[{"name":"ownerIndex","type":"uint256"}],"name":"getOwner","outputs":[{"name":"","type":"address"}],"type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"}],"name":"kill","outputs":[],"type":"function"},{"constant":false,"inputs":[{"name":"_operation","type":"bytes32"}],"name":"getPendingConfirmationsNeeded","outputs":[{"name":"","type":"uint256"}],"type":"function"},{"constant":false,"inputs":[{"name":"_from","type":"address"},{"name":"_to","type":"address"}],"name":"changeOwner","outputs":[],"type":"function"},{"constant":true,"inputs":[],"name":"m_dailyLimit","outputs":[{"name":"","type":"uint256"}],"type":"function"},{"inputs":[{"name":"_owners","type":"address[]"},{"name":"_required","type":"uint256"},{"name":"_daylimit","type":"uint256"}],"type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"name":"owner","type":"address"},{"indexed":false,"name":"operation","type":"bytes32"}],"name":"Confirmation","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"owner","type":"address"},{"indexed":false,"name":"operation","type":"bytes32"}],"name":"Revoke","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"oldOwner","type":"address"},{"indexed":false,"name":"newOwner","type":"address"}],"name":"OwnerChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"newOwner","type":"address"}],"name":"OwnerAdded","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"oldOwner","type":"address"}],"name":"OwnerRemoved","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"newRequirement","type":"uint256"}],"name":"RequirementChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"_from","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Deposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"owner","type":"address"},{"indexed":false,"name":"value","type":"uint256"},{"indexed":false,"name":"to","type":"address"},{"indexed":false,"name":"data","type":"bytes"}],"name":"SingleTransact","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"owner","type":"address"},{"indexed":false,"name":"operation","type":"bytes32"},{"indexed":false,"name":"value","type":"uint256"},{"indexed":false,"name":"to","type":"address"},{"indexed":false,"name":"data","type":"bytes"}],"name":"MultiTransact","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"operation","type":"bytes32"},{"indexed":false,"name":"initiator","type":"address"},{"indexed":false,"name":"value","type":"uint256"},{"indexed":false,"name":"to","type":"address"},{"indexed":false,"name":"data","type":"bytes"}],"name":"ConfirmationNeeded","type":"event"}],
    binary: "6060604052604051611997380380611997833981016040908152815160805160a0519190930180516001908101815533600160a060020a0316600381905560009081526101026020529384205592918190849084905b82518110156100db57828181518110156100025790602001906020020151600160a060020a0316600260005082600201610100811015610002570160009190558351600283019161010291869085908110156100025790602001906020020151600160a060020a0316815260200190815260200160002060005081905550600101610055565b816000600050819055505050508061010f600050819055506100ff62015180420490565b6101115550505050611882806101156000396000f3606060405236156101485760e060020a6000350463173825d9811461019a5780631abfb69c146101f657806323fbae41146102445780632f54bf6e146102635780634123cb6b1461028b578063432dcdb814610294578063523750931461034c57806354fd4d50146103565780635c52c2f51461035e578063659010e71461038857806367f7c83a146103925780637065cb48146103b0578063746c9171146103dd578063797af627146103e65780638607fe8a146103f9578063a0b7967b1461041d578063b20d30a914610467578063b61d27f614610494578063b75c7dc6146104b5578063b945d1f6146104e4578063ba51a6df14610519578063bdba57b314610546578063c2cf7326146105bf578063c41a360a146105fd578063cbf0b0c014610622578063e8aca2a31461064f578063f00d4b5d1461066a578063f1736d861461069c575b6106a660003411156101985760408051600160a060020a033316815234602082015281517fe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c929181900390910190a15b565b6106a66004356000600036604051808383808284378201915050925050506040518091039020610a2b815b60006113e182335b600160a060020a038116600090815261010260205260408120548180828114156116d65761023b565b6106a8600435602435600160a060020a0382166000908152610102602090815260408083205484845261010390925282206001810154600283900a9081169093141592905b50505092915050565b6106a8600435600080805b610104548110156113935761135c816102ac565b6106a86004355b600160a060020a03811660009081526101026020526040812054115b919050565b6106a860015481565b6106a8600080805b6101045481101561133c57611347815b60006101126000506000610104600050848154811015610002576000805160206118628339815191520154909152506020526040812054600160a060020a03168114158061033f5750610104805461011291600091859081101561000257505050506000805160206118628339815191528201548152604081206002908101546001811615610100026000190116048114155b1561153357506001610286565b6106a86101115481565b6106a8600281565b6106a6600036604051808383808284378201915050925050506040518091039020610b74816101c5565b6106a86101105481565b6106a860043560008181526101126020526040902060010154610286565b6106a66004356000366040518083838082843782019150509250505060405180910390206109a3816101c5565b6106a860005481565b6106a86004355b600081610e1c816101c5565b6106ba60043560008181526101126020526040902054600160a060020a0316610286565b6106a8600080805b600a8160ff161015610b5c578161010560ff8316600a811015610002570154111561045f5761010560ff8216600a81101561000257015491505b600101610425565b6106a6600435600036604051808383808284378201915050925050506040518091039020610b68816101c5565b6106a8600480359060248035916044359182019101356000610b933361026a565b6106a6600435600160a060020a03331660009081526101026020526040812054908082811415610745576107c4565b6106a860048035906024803591604435808301929082013591606435916084359160a435918201910135600061105c3361026a565b6106a6600435600036604051808383808284378201915050925050506040518091039020610aea816101c5565b6106d7600435604080516020818101835260008083528481526101128252839020835160029182018054600181161561010002600019011692909204601f8101849004840282018401909552848152929390918301828280156113d55780601f106113aa576101008083540402835291602001916113d5565b6106a8600435602435600082815261010360209081526040808320600160a060020a03851684526101029092528220548281811415610b435761023b565b6106ba6004356000600260018301610100811015610002575050506003810154610286565b6106a6600435600036604051808383808284378201915050925050506040518091039020610b82816101c5565b6106a860043560008181526101036020526040902054610286565b6106a6600435602435600060003660405180838380828437820191505092505050604051809103902061084f816101c5565b6106a861010f5481565b005b60408051918252519081900360200190f35b60408051600160a060020a03929092168252519081900360200190f35b60405180806020018281038252838181518152602001915080519060200190808383829060006004602084601f0104600f02600301f150905090810190601f1680156107375780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b50506000828152610103602052604081206001810154600284900a9290831611156107c45780546001828101805492909101835590839003905560408051600160a060020a03331681526020810186905281517fc7fb647e59b18047309aa15aad418e5d7ca96d173ad704f1031a2c3d7591734b929181900390910190a15b50505050565b600160a060020a03831660028361010081101561000257508301819055600160a060020a03851660008181526101026020908152604080832083905584835291829020869055815192835282019290925281517fb532073b38c83145e3e5135377a08bf9aab55bc0fd7c1179cd4fb995d2a5159c929181900390910190a1505b505050565b156107c45761085d8361026a565b15610868575061084a565b600160a060020a038416600090815261010260205260408120549250821415610891575061084a565b6107ca5b6101045460005b8181101561153b576101048054610112916000918490811015610002576000805160206118628339815191520154825250602091909152604081208054600160a060020a0319168155600181810183905560028281018054858255939493909281161561010002600019011604601f8190106115c057505b50505060010161089c565b60018054810190819055600160a060020a038316906002906101008110156100025790900160005055600154600160a060020a03831660008181526101026020908152604091829020939093558051918252517f994a936646fe87ffe4f1e469d3d6aa417d6b855598397f323de5b449f765f0c3929181900390910190a15b505b50565b1561099e576109b18261026a565b156109bc57506109a0565b6109c4610895565b60015460fa90106109d9576109d76109ee565b505b60015460fa901061091f57506109a0565b610aa85b600060015b600154811015610e18575b60015481108015610a1e5750600281610100811015610002570154600014155b156113f7576001016109fe565b1561084a57600160a060020a038316600090815261010260205260408120549250821415610a59575061099e565b6001600160005054036000600050541115610a74575061099e565b600060028361010081101561000257508301819055600160a060020a038416815261010260205260408120556109ea610895565b5060408051600160a060020a038516815290517f58619076adf5bb0943d100ef88d52d7c3fd691b19d3a9071b555b651fbf418da9181900360200190a1505050565b1561099e57600154821115610aff57506109a0565b6000829055610b0c610895565b6040805183815290517facbdb084c721332ac59f9b8e392196c9eb0e4932862da8eb9beaf0dad4f550da9181900360200190a15050565b506001820154600282900a90811660001415935061023b565b8160010192505b505090565b1561099e575061010f55565b156109a05760006101105550565b1561099e5781600160a060020a0316ff5b15610de057610ba78460006114d13361026a565b8015610bb35750600082145b15610c72577f92ca3a80853e6663fa31fa10b99225f18d4902939b4c53a9caae9043f6efd00433858786866040518086600160a060020a0316815260200185815260200184600160a060020a031681526020018060200182810382528484828181526020019250808284378201915050965050505050505060405180910390a184600160a060020a03168484846040518083838082843782019150509250505060006040518083038185876185025a03f15060009350610de092505050565b600036436040518084848082843782019150508281526020019350505050604051809103902090508050610ca5816103ed565b158015610cc8575060008181526101126020526040812054600160a060020a0316145b15610de05760008181526101126020908152604082208054600160a060020a0319168817815560018181018890556002918201805481865294849020909491821615610100026000190190911691909104601f908101929092048101918591908790839010610de857803560ff19168380011785555b50610d5a9291505b80821115610e185760008155600101610d46565b50507f1733cbb53659d713b79580f79f3f9ff215f78a7c7aa45890f3b89fc5cddfbf328133868887876040518087815260200186600160a060020a0316815260200185815260200184600160a060020a03168152602001806020018281038252848482818152602001925080828437820191505097505050505050505060405180910390a15b949350505050565b82800160010185558215610d3e579182015b82811115610d3e578235826000505591602001919060010190610dfa565b5090565b15610e9e5760008381526101126020526040812054600160a060020a031614610e9e5760408051600091909120805460028281018054600194850154600160a060020a03949094169593949193928392859290811615610100026000190116048015610ecf5780601f10610ea457610100808354040283529160200191610ecf565b50919050565b820191906000526020600020905b815481529060010190602001808311610eb257829003601f168201915b505091505060006040518083038185876185025a03f1505050600084815261011260209081526040918290208054835160018084015433600160a060020a0381811685529684018c9052968301819052929094166060820181905260a06080830181815260029586018054978816156101000260001901909716959095049083018190527fe7c957c06e9a662c1a6c77366179f5b702b97651dc28eee7d5bf1dff6e40bb4a97508a959394919392919060c083019084908015610fd35780601f10610fa857610100808354040283529160200191610fd3565b820191906000526020600020905b815481529060010190602001808311610fb657829003601f168201915b5050965050505050505060405180910390a16000838152610112602052604081208054600160a060020a0319168155600181810183905560028281018054858255939493909281161561010002600019011604601f81901061103e57505b5050506001915050610286565b601f0160209004906000526020600020908101906110319190610d46565b156110f4574285101561110057610002565b50507f1733cbb53659d713b79580f79f3f9ff215f78a7c7aa45890f3b89fc5cddfbf3281338a8c8b8b6040518087815260200186600160a060020a0316815260200185815260200184600160a060020a03168152602001806020018281038252848482818152602001925080828437820191505097505050505050505060405180910390a15b98975050505050505050565b8888888888886040518087600160a060020a03166c01000000000000000000000000028152601401868152602001858580828437820191505083815260200182815260200196505050505050506040518091039020905080506111c9818585858080601f01602080910402602001604051908101604052809392919081815260200183838082843750505050505060006113e884848460008080808080805b600a8560ff1610156115ee578861010560ff8716600a811015610002570154141561160b57610002565b1561128f5788600160a060020a03168888886040518083838082843782019150509250505060006040518083038185876185025a03f192505050507fe7c957c06e9a662c1a6c77366179f5b702b97651dc28eee7d5bf1dff6e40bb4a33828a8c8b8b6040518087600160a060020a0316815260200186815260200185815260200184600160a060020a03168152602001806020018281038252848482818152602001925080828437820191505097505050505050505060405180910390a15060006110f4565b60008181526101126020908152604082208054600160a060020a0319168c17815560018181018c90556002918201805481865294849020909491821615610100026000190190911691909104601f908101929092048101918991908b9083901061130c5782800160ff198235161785555b5061106e929150610d46565b82800160010185558215611300579182015b8281111561130057823582600050559160200191906001019061131e565b8160ff169250610b63565b1561135457600191909101905b60010161029c565b156113a2578160ff1684141561139a5761010480548290811015610002575060005260008051602061186283398151915281015492505b5050919050565b600191909101905b60010161024f565b820191906000526020600020905b8154815290600101906020018083116113b857829003601f168201915b50505050509050610286565b9050610286565b80610de05750610de0846101c5565b5b6001805411801561141a57506001546002906101008110156100025701546000145b1561142e57600180546000190190556113f8565b600154811080156114515750600154600290610100811015610002570154600014155b801561146b57506002816101008110156100025701546000145b156114cc57600154600290610100811015610002578101549082610100811015610002579090016000505580610102600060028361010081101561000257810154825260209290925260408120929092556001546101008110156100025701555b6109f3565b1561028657610111546114e75b62015180420490565b1115611500576000610110556114fb6114de565b610111555b610110548083011080159061151d575061010f5461011054830111155b1561153357506101108054820190556001610286565b506000610286565b61099e6101045460005b8181101561183857610104805482908110156100025760009182526000805160206118628339815191520154146115b85761010480546101039160009184908110156100025760008051602061186283398151915201548252506020919091526040812081815560018101829055600201555b600101611545565b601f0160209004906000526020600020908101906109149190610d46565b96505b5050505050509392505050565b61010586600a811015610002575086015489101561164657610002565b61010586600a8110156100025750808701549060ff8716600a811015610002570154101561163a5760ff851695505b6001949094019361119f565b8861010587600a8110156100025750870155875160411461166a57600096506115e1565b602088015193506040880151925060ff604189015116915060018a838686604051808581526020018460ff1681526020018381526020018281526020019450505050506020604051808303816000866161da5a03f1156100025750506040515190506115de8a826101cd565b6000868152610103602052604081208054909350141561175e57600080548355600183810191909155610104805491820180825582801582901161172d5781836000526020600020918201910161172d9190610d46565b5050506002830181905561010480548892908110156100025760009190915260008051602061186283398151915201555b506001810154600283900a9081166000141561182f5760408051600160a060020a03871681526020810188905281517fe1c52dc63b719ade82e8bea94cc41a0d5d28e4aaf536adb5e9cccc9ff8c1aeda929181900390910190a181546001901161181c57600086815261010360205260409020600201546101048054909190811015610002576040600090812060008051602061186283398151915292909201819055808255600182810182905560029290920155945061023b9050565b8154600019018255600182018054821790555b6000935061023b565b610104805460008083559190915261084a9060008051602061186283398151915290810190610d46564c0be60200faa20559308cb7b5a1bb3255c16cb1cab91f525b5ae7a03d02fabe",
    unlinked_binary: "6060604052604051611997380380611997833981016040908152815160805160a0519190930180516001908101815533600160a060020a0316600381905560009081526101026020529384205592918190849084905b82518110156100db57828181518110156100025790602001906020020151600160a060020a0316600260005082600201610100811015610002570160009190558351600283019161010291869085908110156100025790602001906020020151600160a060020a0316815260200190815260200160002060005081905550600101610055565b816000600050819055505050508061010f600050819055506100ff62015180420490565b6101115550505050611882806101156000396000f3606060405236156101485760e060020a6000350463173825d9811461019a5780631abfb69c146101f657806323fbae41146102445780632f54bf6e146102635780634123cb6b1461028b578063432dcdb814610294578063523750931461034c57806354fd4d50146103565780635c52c2f51461035e578063659010e71461038857806367f7c83a146103925780637065cb48146103b0578063746c9171146103dd578063797af627146103e65780638607fe8a146103f9578063a0b7967b1461041d578063b20d30a914610467578063b61d27f614610494578063b75c7dc6146104b5578063b945d1f6146104e4578063ba51a6df14610519578063bdba57b314610546578063c2cf7326146105bf578063c41a360a146105fd578063cbf0b0c014610622578063e8aca2a31461064f578063f00d4b5d1461066a578063f1736d861461069c575b6106a660003411156101985760408051600160a060020a033316815234602082015281517fe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c929181900390910190a15b565b6106a66004356000600036604051808383808284378201915050925050506040518091039020610a2b815b60006113e182335b600160a060020a038116600090815261010260205260408120548180828114156116d65761023b565b6106a8600435602435600160a060020a0382166000908152610102602090815260408083205484845261010390925282206001810154600283900a9081169093141592905b50505092915050565b6106a8600435600080805b610104548110156113935761135c816102ac565b6106a86004355b600160a060020a03811660009081526101026020526040812054115b919050565b6106a860015481565b6106a8600080805b6101045481101561133c57611347815b60006101126000506000610104600050848154811015610002576000805160206118628339815191520154909152506020526040812054600160a060020a03168114158061033f5750610104805461011291600091859081101561000257505050506000805160206118628339815191528201548152604081206002908101546001811615610100026000190116048114155b1561153357506001610286565b6106a86101115481565b6106a8600281565b6106a6600036604051808383808284378201915050925050506040518091039020610b74816101c5565b6106a86101105481565b6106a860043560008181526101126020526040902060010154610286565b6106a66004356000366040518083838082843782019150509250505060405180910390206109a3816101c5565b6106a860005481565b6106a86004355b600081610e1c816101c5565b6106ba60043560008181526101126020526040902054600160a060020a0316610286565b6106a8600080805b600a8160ff161015610b5c578161010560ff8316600a811015610002570154111561045f5761010560ff8216600a81101561000257015491505b600101610425565b6106a6600435600036604051808383808284378201915050925050506040518091039020610b68816101c5565b6106a8600480359060248035916044359182019101356000610b933361026a565b6106a6600435600160a060020a03331660009081526101026020526040812054908082811415610745576107c4565b6106a860048035906024803591604435808301929082013591606435916084359160a435918201910135600061105c3361026a565b6106a6600435600036604051808383808284378201915050925050506040518091039020610aea816101c5565b6106d7600435604080516020818101835260008083528481526101128252839020835160029182018054600181161561010002600019011692909204601f8101849004840282018401909552848152929390918301828280156113d55780601f106113aa576101008083540402835291602001916113d5565b6106a8600435602435600082815261010360209081526040808320600160a060020a03851684526101029092528220548281811415610b435761023b565b6106ba6004356000600260018301610100811015610002575050506003810154610286565b6106a6600435600036604051808383808284378201915050925050506040518091039020610b82816101c5565b6106a860043560008181526101036020526040902054610286565b6106a6600435602435600060003660405180838380828437820191505092505050604051809103902061084f816101c5565b6106a861010f5481565b005b60408051918252519081900360200190f35b60408051600160a060020a03929092168252519081900360200190f35b60405180806020018281038252838181518152602001915080519060200190808383829060006004602084601f0104600f02600301f150905090810190601f1680156107375780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b50506000828152610103602052604081206001810154600284900a9290831611156107c45780546001828101805492909101835590839003905560408051600160a060020a03331681526020810186905281517fc7fb647e59b18047309aa15aad418e5d7ca96d173ad704f1031a2c3d7591734b929181900390910190a15b50505050565b600160a060020a03831660028361010081101561000257508301819055600160a060020a03851660008181526101026020908152604080832083905584835291829020869055815192835282019290925281517fb532073b38c83145e3e5135377a08bf9aab55bc0fd7c1179cd4fb995d2a5159c929181900390910190a1505b505050565b156107c45761085d8361026a565b15610868575061084a565b600160a060020a038416600090815261010260205260408120549250821415610891575061084a565b6107ca5b6101045460005b8181101561153b576101048054610112916000918490811015610002576000805160206118628339815191520154825250602091909152604081208054600160a060020a0319168155600181810183905560028281018054858255939493909281161561010002600019011604601f8190106115c057505b50505060010161089c565b60018054810190819055600160a060020a038316906002906101008110156100025790900160005055600154600160a060020a03831660008181526101026020908152604091829020939093558051918252517f994a936646fe87ffe4f1e469d3d6aa417d6b855598397f323de5b449f765f0c3929181900390910190a15b505b50565b1561099e576109b18261026a565b156109bc57506109a0565b6109c4610895565b60015460fa90106109d9576109d76109ee565b505b60015460fa901061091f57506109a0565b610aa85b600060015b600154811015610e18575b60015481108015610a1e5750600281610100811015610002570154600014155b156113f7576001016109fe565b1561084a57600160a060020a038316600090815261010260205260408120549250821415610a59575061099e565b6001600160005054036000600050541115610a74575061099e565b600060028361010081101561000257508301819055600160a060020a038416815261010260205260408120556109ea610895565b5060408051600160a060020a038516815290517f58619076adf5bb0943d100ef88d52d7c3fd691b19d3a9071b555b651fbf418da9181900360200190a1505050565b1561099e57600154821115610aff57506109a0565b6000829055610b0c610895565b6040805183815290517facbdb084c721332ac59f9b8e392196c9eb0e4932862da8eb9beaf0dad4f550da9181900360200190a15050565b506001820154600282900a90811660001415935061023b565b8160010192505b505090565b1561099e575061010f55565b156109a05760006101105550565b1561099e5781600160a060020a0316ff5b15610de057610ba78460006114d13361026a565b8015610bb35750600082145b15610c72577f92ca3a80853e6663fa31fa10b99225f18d4902939b4c53a9caae9043f6efd00433858786866040518086600160a060020a0316815260200185815260200184600160a060020a031681526020018060200182810382528484828181526020019250808284378201915050965050505050505060405180910390a184600160a060020a03168484846040518083838082843782019150509250505060006040518083038185876185025a03f15060009350610de092505050565b600036436040518084848082843782019150508281526020019350505050604051809103902090508050610ca5816103ed565b158015610cc8575060008181526101126020526040812054600160a060020a0316145b15610de05760008181526101126020908152604082208054600160a060020a0319168817815560018181018890556002918201805481865294849020909491821615610100026000190190911691909104601f908101929092048101918591908790839010610de857803560ff19168380011785555b50610d5a9291505b80821115610e185760008155600101610d46565b50507f1733cbb53659d713b79580f79f3f9ff215f78a7c7aa45890f3b89fc5cddfbf328133868887876040518087815260200186600160a060020a0316815260200185815260200184600160a060020a03168152602001806020018281038252848482818152602001925080828437820191505097505050505050505060405180910390a15b949350505050565b82800160010185558215610d3e579182015b82811115610d3e578235826000505591602001919060010190610dfa565b5090565b15610e9e5760008381526101126020526040812054600160a060020a031614610e9e5760408051600091909120805460028281018054600194850154600160a060020a03949094169593949193928392859290811615610100026000190116048015610ecf5780601f10610ea457610100808354040283529160200191610ecf565b50919050565b820191906000526020600020905b815481529060010190602001808311610eb257829003601f168201915b505091505060006040518083038185876185025a03f1505050600084815261011260209081526040918290208054835160018084015433600160a060020a0381811685529684018c9052968301819052929094166060820181905260a06080830181815260029586018054978816156101000260001901909716959095049083018190527fe7c957c06e9a662c1a6c77366179f5b702b97651dc28eee7d5bf1dff6e40bb4a97508a959394919392919060c083019084908015610fd35780601f10610fa857610100808354040283529160200191610fd3565b820191906000526020600020905b815481529060010190602001808311610fb657829003601f168201915b5050965050505050505060405180910390a16000838152610112602052604081208054600160a060020a0319168155600181810183905560028281018054858255939493909281161561010002600019011604601f81901061103e57505b5050506001915050610286565b601f0160209004906000526020600020908101906110319190610d46565b156110f4574285101561110057610002565b50507f1733cbb53659d713b79580f79f3f9ff215f78a7c7aa45890f3b89fc5cddfbf3281338a8c8b8b6040518087815260200186600160a060020a0316815260200185815260200184600160a060020a03168152602001806020018281038252848482818152602001925080828437820191505097505050505050505060405180910390a15b98975050505050505050565b8888888888886040518087600160a060020a03166c01000000000000000000000000028152601401868152602001858580828437820191505083815260200182815260200196505050505050506040518091039020905080506111c9818585858080601f01602080910402602001604051908101604052809392919081815260200183838082843750505050505060006113e884848460008080808080805b600a8560ff1610156115ee578861010560ff8716600a811015610002570154141561160b57610002565b1561128f5788600160a060020a03168888886040518083838082843782019150509250505060006040518083038185876185025a03f192505050507fe7c957c06e9a662c1a6c77366179f5b702b97651dc28eee7d5bf1dff6e40bb4a33828a8c8b8b6040518087600160a060020a0316815260200186815260200185815260200184600160a060020a03168152602001806020018281038252848482818152602001925080828437820191505097505050505050505060405180910390a15060006110f4565b60008181526101126020908152604082208054600160a060020a0319168c17815560018181018c90556002918201805481865294849020909491821615610100026000190190911691909104601f908101929092048101918991908b9083901061130c5782800160ff198235161785555b5061106e929150610d46565b82800160010185558215611300579182015b8281111561130057823582600050559160200191906001019061131e565b8160ff169250610b63565b1561135457600191909101905b60010161029c565b156113a2578160ff1684141561139a5761010480548290811015610002575060005260008051602061186283398151915281015492505b5050919050565b600191909101905b60010161024f565b820191906000526020600020905b8154815290600101906020018083116113b857829003601f168201915b50505050509050610286565b9050610286565b80610de05750610de0846101c5565b5b6001805411801561141a57506001546002906101008110156100025701546000145b1561142e57600180546000190190556113f8565b600154811080156114515750600154600290610100811015610002570154600014155b801561146b57506002816101008110156100025701546000145b156114cc57600154600290610100811015610002578101549082610100811015610002579090016000505580610102600060028361010081101561000257810154825260209290925260408120929092556001546101008110156100025701555b6109f3565b1561028657610111546114e75b62015180420490565b1115611500576000610110556114fb6114de565b610111555b610110548083011080159061151d575061010f5461011054830111155b1561153357506101108054820190556001610286565b506000610286565b61099e6101045460005b8181101561183857610104805482908110156100025760009182526000805160206118628339815191520154146115b85761010480546101039160009184908110156100025760008051602061186283398151915201548252506020919091526040812081815560018101829055600201555b600101611545565b601f0160209004906000526020600020908101906109149190610d46565b96505b5050505050509392505050565b61010586600a811015610002575086015489101561164657610002565b61010586600a8110156100025750808701549060ff8716600a811015610002570154101561163a5760ff851695505b6001949094019361119f565b8861010587600a8110156100025750870155875160411461166a57600096506115e1565b602088015193506040880151925060ff604189015116915060018a838686604051808581526020018460ff1681526020018381526020018281526020019450505050506020604051808303816000866161da5a03f1156100025750506040515190506115de8a826101cd565b6000868152610103602052604081208054909350141561175e57600080548355600183810191909155610104805491820180825582801582901161172d5781836000526020600020918201910161172d9190610d46565b5050506002830181905561010480548892908110156100025760009190915260008051602061186283398151915201555b506001810154600283900a9081166000141561182f5760408051600160a060020a03871681526020810188905281517fe1c52dc63b719ade82e8bea94cc41a0d5d28e4aaf536adb5e9cccc9ff8c1aeda929181900390910190a181546001901161181c57600086815261010360205260409020600201546101048054909190811015610002576040600090812060008051602061186283398151915292909201819055808255600182810182905560029290920155945061023b9050565b8154600019018255600182018054821790555b6000935061023b565b610104805460008083559190915261084a9060008051602061186283398151915290810190610d46564c0be60200faa20559308cb7b5a1bb3255c16cb1cab91f525b5ae7a03d02fabe",
    address: "0x69528ab301321f73007158f6548e223d242a7386",
    generated_with: "2.0.9",
    contract_name: "Wallet"
  };

  function Contract() {
    if (Contract.Pudding == null) {
      throw new Error("Wallet error: Please call load() first before creating new instance of this contract.");
    }

    Contract.Pudding.apply(this, arguments);
  };

  Contract.load = function(Pudding) {
    Contract.Pudding = Pudding;

    Pudding.whisk(contract_data, Contract);

    // Return itself for backwards compatibility.
    return Contract;
  }

  Contract.new = function() {
    if (Contract.Pudding == null) {
      throw new Error("Wallet error: Please call load() first before calling new().");
    }

    return Contract.Pudding.new.apply(Contract, arguments);
  };

  Contract.at = function() {
    if (Contract.Pudding == null) {
      throw new Error("Wallet error: Please call load() first before calling at().");
    }

    return Contract.Pudding.at.apply(Contract, arguments);
  };

  Contract.deployed = function() {
    if (Contract.Pudding == null) {
      throw new Error("Wallet error: Please call load() first before calling deployed().");
    }

    return Contract.Pudding.deployed.apply(Contract, arguments);
  };

  if (typeof module != "undefined" && typeof module.exports != "undefined") {
    module.exports = Contract;
  } else {
    // There will only be one version of Pudding in the browser,
    // and we can use that.
    window.Wallet = Contract;
  }

})();
