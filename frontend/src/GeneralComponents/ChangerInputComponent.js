import { CheckOutlined } from "@ant-design/icons";
import {DatePicker, Input, InputNumber} from "antd";
import React from "react";
import ButtonComponent from "./ButtonComponent";
import TextArea from "antd/es/input/TextArea";
import dayjs from "dayjs";



const ChangerInputComponent = ({value, action, max = 255, type = 'input', empty = false}) => {

    const [ mode, setMode ] = React.useState(false);
    const [ inputVal, setInputVal ] = React.useState(value);

    const datepickerProps = {
        onChange : (date, datestring) => { setInputVal( datestring ? datestring : null ); }
    };

    if ( type === 'date' && value !== 'Girilmemiş' ){
        datepickerProps.defaultValue = dayjs(value, 'YYYY-MM-DD');
    }


    return(
        <div style={{cursor:'pointer'}} onClick={() => { !mode && setMode(true) }}>
            {
                mode ?
                    <div style={{display:'flex'}}>
                        {
                            type === 'input' ?
                                <Input showCount maxLength={ max } value={inputVal}  allowClear onChange = {  (e) => { setInputVal(e.currentTarget.value); }}/>
                            :
                            type === 'textarea' ?
                                <TextArea style={{fontSize:(value.length > 100 ? 10 : 14), height:(value.length > 100 ? 120 : 60 )}} showCount maxLength={ max } value={inputVal}  allowClear onChange = {  (e) => { setInputVal(e.currentTarget.value); }}/>
                            :
                            type === 'number' ?
                                <InputNumber value={inputVal} onChange = {  (number) => { setInputVal(number); }} />
                            :
                                <DatePicker {...datepickerProps} />
                        }
                        <ButtonComponent type='primary' style={{backgroundColor:'green', marginLeft:10, width:'min-content', height:'min-content', padding:'0 3px'}} onClick = { async () => {
                            if ( inputVal === value ) {
                                setMode(false);
                                return;
                            }
                            if ( empty || inputVal ) {
                                const isSuccess = await action(inputVal,setInputVal);
                                
                                if ( !isSuccess ) {
                                    setInputVal(value);
                                }
                            }
                            else{
                                setInputVal(value);
                            }
                            setMode(false);
                        } }><CheckOutlined/></ButtonComponent>
                    </div>
                :
                    <div onClick={() => { setMode(true) }}>{inputVal.toString().length > 100 ? inputVal.toString().substring(0,100)+'...' : inputVal}</div>
            }
        </div>
    )

}

export default ChangerInputComponent;