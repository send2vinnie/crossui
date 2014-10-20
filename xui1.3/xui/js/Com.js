/*
    initialize
beforeCreated
onCreated
onLoadBaseClass
onLoadReqiredClass
onIniResource
    iniResource (asy)
beforeIniComponents
    iniComponents (asy)
afterIniComponents
    iniExComs (asy)
onReady
onRender
onDestroy
*/

Class('xui.Com',null,{
    Initialize:function(){
        var ns=this;
        xui.launch = function(cls, onEnd, lang, theme, showUI){
            ns.load.apply(ns, arguments);
        };
    },
    After:function(){
          this._pool={};
    },
    Constructor:function(properties, events, host){
        var self=this;
        self._nodes=[];
        self.host=host||self;

        self.$xid=self.constructor._ctrlId.next();

        self.constructor._pool[self.$xid]=xui.Com._pool[self.$xid]=self;

        self.properties = properties || (self.properties?_.clone(self.properties):{});
        //copy those from class setting
        self.events = _.copy(self.events) || {};
        if(events)
            _.merge(self.events, events, 'all');
        self._ctrlpool={};

        self._innerCall('initialize');
    },
    Instance:{
        autoDestroy:true,
        dataBindLoadType:"none", // "sync", "async", "none"
        background:"",

        _toDomElems:function(){
            var ns=this;
            if(!ns.created)
                // create synchronously
                ns.create(null,false)
            ns.render();
            return ns.getUIComponents()._toDomElems();
        },
        setAlias:function(str){
            var self=this,old=self.alias;
            if(old && self.host && self.host!==self)
                try{delete self.host[old]}catch(e){self.host[old]=undefined}
            if(self.host && self.host!==self)
                self.host[str]=self;
            return self;
        },
        getAlias:function(){
            return this.alias;
        },
        setHost:function(host, alias){
            var self=this;
            self.host=host;
            if(alias)
                self.setAlias(alias);
            return self;
        },
        getHost:function(){
            return this.host;
        },
        setProperties:function(key,value){
            var self=this;
            if(!key)
                self.properties={};
            else if(typeof key=='string')
                self.properties[key]=value;
            else
                _.merge(self.properties, key, 'all');
            return self;
        },
        getProperties:function(key){
            return key?this.properties[key]:this.properties;
        },
        setEvents:function(key,value){
            var self=this;
            if(!key)
                self.events={};
            else if(typeof key=='string')
                self.events[key]=value;
            else
                _.merge(self.events, key, 'all');
            return self;
        },
        getEvents:function(key){
            return key?this.events[key]:this.events;
        },
        // for outter events
        fireEvent:function(name, args, host){
            var t,o,r,l,self=this;
            if(self.events && (t=self.events[name])){
                if(t){
                    var host=host||self.host||self;
                    args=args||[];
                    if(!_.isArr(t))t=[t];
                    l=t.length;
                    var temp={};
                    var n=0,fun=function(input){
                        // set prompt's global var
                        if(_.isSet(input))
                            temp.input=input;
                            //_.set(xui.$cache.data,['pseudocode','input'],input);
                        //resume from [n]
                        for(j=n;j<l;j++){
                            n=j+1;
                            o=t[j];
                            if(typeof o=='string')o=host[o];
                            if(typeof o=='function')r=_.tryF(o, args, host);
                            else if(_.isHash(o)){
                                if(o.resume){
                                    // resume
                                    (o.params||(o.params=[]))[parseInt(o.resume,10)||0]=fun;
                                    r=xui.pseudocode.exec(o,args,host,temp);
                                    break;
                                }else
                                    r=xui.pseudocode.exec(o,args,host,temp);
                            }
                        }
                        return r;
                    };
                    return fun();
                }
            }
        },
        // for inner events
        _fireEvent:function(name, args){
            var t,o,r,l,self=this;
            if(self.events && (t=self.events[name])){
                self.$lastEvent=name;
                if(t){
                    var host=self.host||self
                    args=args||[];
                    args.splice(0,0,self,self.threadid);

                    if(!_.isArr(t))t=[t];
                    l=t.length;
                    for(var i=0;i<l;i++){
                        o=t[i];
                        if(typeof o=='string')o=self[o];
                        if(typeof o=='function')r=o.apply(host, args);
                        else if(_.isHash(o))r=xui.pseudocode.exec(o,args,host);
                    }
                    return r;
                }
            }
        },
        _innerCall:function(name){
            var self=this;
            return _.tryF(self[name],[self, self.threadid],self);
        },
        customAppend:function(parent,subId,left,top,threadid){
            return false;
        },
        show:function(onEnd,parent,subId,threadid,left,top){
            parent=parent||xui('body');

            var self=this,f=function(){
                var style=self.customStyle;
                if(style && !_.isEmpty(style)){
                    var arr=[];
                    _.each(style,function(v,k){
                        arr.push(k+" : "+v+";");
                    });
                    var txt=".xui-com-"+self.$xid+"{\r\n"+arr.join("\r\n")+"\r\n}";
                    xui.CSS.addStyleSheet(txt,"xui:css:com-"+self.$xid,1);
                }
                // no UI control in com
                if(self.getUIComponents().isEmpty()){
                    _.tryF(self.customAppend,[parent,subId,left,top,threadid], self);
                    _.tryF(onEnd,[null, self, threadid],self.host);
                }else{
                    // if parent is an ui object without rendered, dont render the com
                    if(!(parent && parent['xui.UI'] && !parent.get(0).renderId))
                        self.render();

                    if(false===_.tryF(self.customAppend,[parent,subId,left,top,threadid], self)){
                        //append only
                        parent.append(self.getUIComponents(false),subId);
                        // append and show
                        self.getUIComponents(true).show(parent, subId).each(function(o){
                            if(o.KEY=='xui.UIProfile' && _.get(o,['properties','defaultFocus'])){
                               try{_.asyRun(function(){o.boxing().activate()})}catch(e){}
                            }
                        });
                    }
                    self.renderId='ok';
                    _.tryF(onEnd,[null, self, threadid],self.host);
                }
            };
            self.threadid=threadid;
            if(self.created) f();
            else self.create(f,threadid);
            return self;
        },
        hide:function(){
            this.getUIComponents(true).hide();
        },
        render:function(triggerLayout){
            var self=this;
            if(self.renderId!='ok'){
                self.getUIComponents().render(triggerLayout);
                self._fireEvent('onRender');
                self.renderId='ok';
            }
            return self;
        },
        create:function(onEnd, threadid){
            //get paras
            var self=this;

            if(self.created){
                _.tryF(onEnd,[null, self, threadid],self.host);
                return;
            }

            var  t,funs=[]
                ;
            self.threadid=threadid;

            if(false===self._fireEvent('beforeCreated'))return;
            //if no threadid or threadid doesn't exist, reset threadid to self
            funs.push(function(threadid){
                if(threadid)
                    self.threadid=threadid;
                self._fireEvent('onCreated');
            });

            //databinder
            if(self.dataBindLoadType!="none"){
                var bds=self.getDataBinders();
                if(bds && bds.length){
                    var dbf=function(threadid){
                        var hash={};
                        _.arr.each(bds,function(bd, i){
                            var ajax=bd.boxing().read(null,null,null,null,"return");
                            if(ajax)hash[i]=ajax;
                        });
                        if(!_.isEmpty(hash))
                            xui.absIO.groupCall(hash, null, null, null, threadid);
                        bds.length=0;
                        hash=bds=null;
                    };
                    if(self.dataBindLoadType=="sync")
                        funs.push(dbf);
                    else
                        dbf();
                }
            }

            //base classes
            if((t=self.base) && t.length)
                funs.push(function(threadid){
                    xui.SC.groupCall(self.base,function(key){
                        self._fireEvent('onLoadBaseClass', [key]);
                    },null,threadid);
                });
            //load required class
            if((t=self.required) && t.length)
                funs.push(function(threadid){
                    xui.SC.groupCall(self.required,function(key){
                        self._fireEvent('onLoadReqiredClass', [key]);
                    },null,threadid);
                });
            //inner components
            if(self.iniComponents)
                funs.push(function(){
                    self._createInnerComs();
                });
            //load resource here
            if(self.iniResource)
                funs.push(function(){
                    self._fireEvent('onIniResource');
                    self._innerCall('iniResource');
                });
            //Outter components
            if(self.iniExComs)
                funs.push(function(){
                    self._innerCall('iniExComs');
                });
            //core
            funs.push(function(threadid){
                //lazy load
                if(self.background)
                    xui.SC.runInBG(self.background);
                self._fireEvent('onReady');
            });
            funs.push(function(threadid){
                self.created=true;
                _.tryF(onEnd,[null, self, threadid],self.host);
            });
            if(threadid===false){
                _.arr.each(funs,function(fun){
                    fun.call();
                });
            }else{
                //use asyUI to insert tasks
                xui.Thread.observableRun(funs,null,threadid);
            }

            return self;
        },
        _createInnerComs:function(){
            var self=this;
            if(self._innerComsCreated)
                return;
            if(false===self._fireEvent('beforeIniComponents'))return;
            Array.prototype.push.apply(self._nodes, self._innerCall('iniComponents')||[]);
            // attach destroy to the first UI control
            if(self.autoDestroy)
                _.arr.each(self._nodes,function(o){
                    if(o.box && o.box["xui.UI"] && !o.box.$initRootHidden){
                        (o.$afterDestroy=(o.$afterDestroy||{}))["comDestroyTrigger"]=function(){
                            if(self.autoDestroy && !self.destroyed)
                                self.destroy();
                            self=null;
                        };
                        return false;
                    }
                });
            self._fireEvent('afterIniComponents');
            self._innerComsCreated=true;
        },
        iniComponents:function(){},
        getAllComponents:function(){
            if(!this._innerComsCreated)
                this._createInnerComs();

            var arr=[];
            _.each(this._ctrlpool,function(o){
                arr.push(o);
            });
            return xui.absObj.pack(arr,false);
        },
        getData:function(){
            var hash={};
            this.getAllComponents().each(function(prf){
                var prop=prf.properties,
                    ih=hash[prf.alias]={};
                _.arr.each(["src",'html','items','lsitKey','header','rows',"target","toggle","attr","JSONData","XMLData","JSONUrl","XMLUrl","dateStart","value",'labelCaption'],function(k){
                    if(k in prop)ih[k]=prop[k];
                });
                if('caption' in prop && _.isSet(prop.caption))
                    ih.caption=prop.caption;
            });
            return hash;
        },
        setData:function(data){
            this.getAllComponents().each(function(prf){
                var prop=prf.properties,
                    ins=prf.boxing(),
                    ih=data[prf.alias];
                if(ih && _.isHash(ih) && !_.isEmpty(ih)){
                    _.arr.each(["src",'html','items','lsitKey','header','rows',"target","toggle","attr","JSONData","XMLData","JSONUrl","XMLUrl","dateStart","value",'labelCaption',"caption"],function(k){
                        if(k in prop && k in ih)ins['set'+_.str.initial(k)](ih[k]);
                    });
                }
            });
            return this;
        },
        getValue:function(){
            var hash={};
            this.getAllComponents().each(function(prf){
                if('value' in prf.properties)
                    hash[prf.alias]=prf.properties.value;
            });
            return hash;
        },
        setValue:function(values){
            if(!_.isEmpty(values)){
                this.getAllComponents().each(function(prf){
                    if('value' in prf.properties && prf.alias in values)
                        prf.boxing().setValue(values[prf.alias],null,'com')
                });
            }
            return this;
        },
        getUIValue:function(){
            var hash={};
            this.getAllComponents().each(function(prf){
                if('$UIvalue' in prf.properties)
                    hash[prf.alias]=prf.properties.$UIvalue;
            });
            return hash;
        },
        setUIValue:function(values){
            if(!_.isEmpty(values)){
                this.getAllComponents().each(function(prf){
                    if('value' in prf.properties && prf.alias in values)
                        prf.boxing().setUIValue(values[prf.alias],null,null,'com')
                });
            }
            return this;
        },
        getDataBinders:function(){
            if(!this._innerComsCreated)
                this._createInnerComs();
            var nodes = _.copy(this._nodes),t,k='xui.DataBinder';
            _.filter(nodes,function(o){
                return !!(o.box[k]);
            });
            return nodes;
        },
        // flag:true => no  $initRootHidden
        // flag:false => $initRootHidden
        // no flag: all
        getUIComponents:function(flag){
            if(!this._innerComsCreated)
                this._createInnerComs();
            var nodes = _.copy(this._nodes),t,k='xui.UI',n='$initRootHidden';
            _.filter(nodes,function(o){
                return !!(o.box[k]) && (flag===true?!o.box[n]:flag===false?o.box[n]:true);
            });
            return xui.UI.pack(nodes, false);
        },
        getComponents:function(){
            if(!this._innerComsCreated)
                this._createInnerComs();
            return xui.absObj.pack(_.copy(this._nodes),false);
        },
        setComponents:function(obj){
            var self=this,t;
            _.arr.each(self._nodes,function(o){
                if((t=self[o.alias]) &&t.get(0)==o)
                    delete self[o.alias];
            });
            _.arr.each(self._nodes=obj.get(),function(o){
                // set host
                o.boxing().setHost(self, o.alias);
            });
            return self;
        },
        AddComponents:function(obj){
            var self=this,ns=self._nodes;
            _.arr.each(obj.get(),function(o){
                o.boxing().setHost(self, o.alias);
                self._nodes.push(o);
            });
            return self;
        },
        isDestroyed:function(){
            return !!this.destroyed;
        },
        destroy:function(){
            var self=this,ns=self._nodes;
            self._fireEvent('onDestroy');
            //set once
            self.destroyed=true;
            if(ns && ns.length)
                _.arr.each(ns, function(o){
                    if(o && o.box)
                        o.boxing().destroy();
                },null,true);
            if(ns && ns.length)
                self._nodes.length=0;
            self._ctrlpool=null;

            delete self.constructor._pool[self.$xid]
            delete xui.Com._pool[self.$xid];

            _.breakO(self);
            self.destroy=function(){};
            //set again
            self.destroyed=true;
        }
    },
    Static:{
        _ctrlId : new _.id(),
        getClsFromDom:function(id){
            var prf=xui.UIProfile.getFromDom(id);
            if(prf&&(prf=prf.host)){
                return prf.KEY;
            }
        },
        getAllInstance:function(){
            return this._pool;
        },
        destroyAll:function(){
            _.each(this._pool,function(o){
                if(!o.destroyed)o.destroy();
            });
        },
        load:function(cls, onEnd, lang, theme, showUI){
            if(!cls){
                var e=new Error("No cls");
                _.tryF(onEnd,[e,null]);
                throw e;
            }
            // compitable
            if(typeof theme=='function')thowUI=theme;

            var fun=function(){
                var ifun=function(path){
                    //if successes
                    if(path){
                        try{
                            _.each(this.viewStyles,function(v,k){
                                xui('html').css(k, xui.adjustRes(v));
                            });
                        }catch(e){}
                        var a=this,f=function(){
                            if(!_.isFun(a))
                                throw "'"+cls+"' is not a constructor";
                            var o=new a();
                            // record it
                            a._callfrom=cls;
                            if(showUI!==false)o.show(onEnd);
                            else _.tryF(onEnd,[null,o],o);
                        };
                        if(theme&&theme!="default"){
                            xui.setTheme(theme,true,function(){
                                //get locale info
                                if(lang) xui.setLang(lang, f);
                                else f();
                            });
                        }else{
                            //get locale info
                            if(lang) xui.setLang(lang, f);
                            else f();
                        }
                    }else{
                        var e=new Error("No class name");
                        _.tryF(onEnd,[e,null]);
                        throw e;
                    }
                };
                if(typeof(cls)=='function'&&cls.$xui$)ifun(ok);
                else cls=cls+"";
                if(/\.js$/i.test(cls))
                    xui.fetchClass(cls,ifun,
                        function(e){
                            _.tryF(onEnd,[e,null]);
                        });
                else
                    //get app class
                    xui.SC(cls,ifun,true,null,{
                        retry:0,
                        onFail:function(e){
                            _.tryF(onEnd,[e,null]);
                        }
                    });
            };
            if(xui.isDomReady)
                fun();
            else
                xui.main(fun);
        },
        $EventHandlers:{
            beforeCreated:function(com, threadid){},
            onLoadBaseClass:function(com, threadid, key){},
            onIniResource:function(com, threadid){},
            beforeIniComponents:function(com, threadid){},
            afterIniComponents:function(com, threadid){},
            onLoadRequiredClass:function(com, threadid, key){},
            onReady:function(com, threadid){},
            onRender:function(com, threadid){},
            onDestroy:function(com){}
        }
    }
});